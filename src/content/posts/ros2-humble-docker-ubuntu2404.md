---
title: "在 Ubuntu 24.04 上用 Docker 装一个 ROS 2 Humble"
slug: "ros2-humble-docker-ubuntu2404"
description: "宿主机是 ROS 2 Jazzy 又不能卸载，用 Docker 隔离出一套 Humble 开发环境，记录镜像加速、Humble 安装、容器参数与 X11 图形界面踩坑。"
publishedAt: 2026-11-21
category: "机器人"
tags: ["ROS2", "Docker", "Ubuntu", "环境搭建", "Humble"]
draft: false
---

# 在 Ubuntu 24.04 上用 Docker 装一个 ROS 2 Humble

> 副标题：从"版本冲突"到"一条命令进环境"，含镜像加速、基础镜像选择、容器参数解释与 RViz 显示排错记录

宿主机是 Ubuntu 24.04，系统自带 ROS 2 Jazzy，而比赛提供的机器人包是按 Humble 验证的。本文记录一套不改动宿主机的隔离方案：用 `ubuntu:22.04` 构建 Humble 镜像、`docker commit` 固化、带 `--net=host` 与 X11 挂载启动容器，最后在宿主机放行 `xhost` 让 RViz 正常显示。

运行环境：Ubuntu 24.04 + docker-ce 29.10.0 + 容器内 ROS 2 Humble，镜像体积 5.28GB，图形界面为软件渲染。

## 一、为什么非要装 Humble

宿主机是 Ubuntu 24.04，系统自带的是 **ROS 2 Jazzy**。

问题不在 Jazzy 好不好用，而在于：比赛提供的机器人包、URDF 和 RViz 配置，全部是按 **Humble** 验证过的。这种版本差异不是改两个路径就能糊弄过去的，`ament_cmake` 版本、消息定义、甚至 `rviz2` 的插件加载都可能出问题。

那能不能把 Jazzy 卸了重装 Humble？

不能。理由有三条：

1. 这台机器上还有别的项目依赖 Jazzy；
2. Ubuntu 24.04 的 apt 源里没有 Humble 的二进制包，Humble 官方只支持到 22.04；
3. 手动降级系统 ROS 的依赖链，一旦把系统搞坏，修起来比装 Docker 贵得多。

所以结论很明确：**宿主机保留 Jazzy，另开一个 22.04 的环境跑 Humble**。

## 二、为什么是 Docker

可选项其实有三个：

- **双系统**：环境纯粹，但切换要重启，文件不互通；
- **conda / venv**：轻量，但解决不了系统库和 apt 依赖；
- **Docker**：隔离干净、可随时重建，代价是图形界面要额外配置。

ROS 2 的依赖大量落在系统库和 apt 包里，虚拟环境解决不了。双系统对开发效率的伤害太大。

Docker 的额外收益是：**环境可以保存、可以复制、可以删除重来**。今天搞坏了，明天删掉重建一个，不用重装系统。

## 三、装 Docker：先解决拉不动镜像的问题

宿主机装的是官方 `docker-ce`，不是 Ubuntu 源里的 `docker.io`。两者差别不大，但官方源的版本更新，插件也齐（`buildx`、`compose`）。

装完之后，遇到的第一个问题是：**镜像拉取超时**。

Docker Hub 在国内基本不可用，`docker pull ubuntu:22.04` 会卡在拉取层上，几个小时都没动静。这不是网络配置问题，纯属源的问题。

解决办法是配置镜像加速：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://docker.1ms.run"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

改完 `daemon.json` 必须重启 Docker 服务，只 reload 不生效。

验证加速是否起作用，先拉一个最小的镜像测试：

```bash
docker pull hello-world
docker run --rm hello-world
```

能跑出那段 "Hello from Docker!" 就说明链路通了。

## 四、装 ROS 2 Humble

有了 `ubuntu:22.04`，接下来的事就是在一个干净系统里按官方文档装 Humble。

```bash
docker run -it --name humble_build ubuntu:22.04 bash
```

进入容器后：

```bash
apt update && apt install -y curl gnupg lsb-release

curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key \
  -o /usr/share/keyrings/ros-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] \
  http://packages.ros.org/ros2/ubuntu jammy main" \
  > /etc/apt/sources.list.d/ros2.list

apt update
apt install -y ros-humble-desktop python3-colcon-common-extensions
```

这里有两个容易踩的点：

**一是 `jammy` 必须写死。** Humble 对应的是 Ubuntu 22.04 的代号 `jammy`，不能跟着宿主机写成 `noble`，否则源里什么都找不到。

**二是基础镜像里没有 `sudo` 和 `lsb_release`。** 容器默认就是 root，不需要 sudo；`lsb_release` 要装 `lsb-release` 才有，而 `ubuntu:22.04` 默认没带。

装完先验一下：

```bash
source /opt/ros/humble/setup.bash
ros2 --version
```

能打出 `ros2` 的版本号，说明这套环境可用。

## 五、把装好的环境固化成镜像

如果每次启动都从 `ubuntu:22.04` 重新走一遍 apt，光下载就要十几分钟。所以装完之后，把容器提交成了镜像：

```bash
docker commit humble_build ros-humble:local
```

`ros-humble:local` 就是现在一直在用的镜像，5.28GB。名字里的 `local` 是提醒自己：**这是本地构建的，不是官方镜像**，以后换机器要自己重建。

这也是 Docker 最舒服的一点：一次折腾，之后启动是几秒钟的事。

## 六、创建正式容器

真正的开发容器不能每次从头 `run`，参数要一次配好：

```bash
docker run -dit \
  --name bajie \
  --net=host \
  --ipc=host \
  -e DISPLAY=:1 \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v "/home/kkka/文档/trae/BAJIE_CUP:/work" \
  -w /workspace \
  ros-humble:local bash
```

逐个解释这些参数，因为它们决定了后面能不能正常工作：

**`--net=host`**：容器和宿主机共用网络。ROS 2 靠 DDS 发现节点，如果容器在 NAT 后面，宿主机上的节点和容器里的节点互相看不见。这一条不加，话题就订阅不到。

**`--ipc=host`**：共享进程间通信。ROS 2 的共享内存传输需要它，不加会退化成走网络回环，大消息（点云、图像）性能明显变差。

**`-e DISPLAY=:1`**：把宿主机的图形显示编号传给容器。`DISPLAY` 的值取决于桌面环境，这里是 `:1`，有些机器是 `:0`，用 `echo $DISPLAY` 确认。

**`-v /tmp/.X11-unix:/tmp/.X11-unix`**：把 X11 的 socket 目录挂进去，这是容器能显示图形界面的前提。

**`-v .../BAJIE_CUP:/work`**：工作目录映射。这块最重要，代码留在宿主机，容器只负责运行环境。这样容器删了，代码还在。

**`-w /workspace`**：容器启动后的默认目录。

后续日常使用就一条命令：

```bash
docker start -ai bajie
```

## 七、图形界面：还差一步权限

容器参数都配好了，进容器执行 `rviz2` 还是报错：

```
qt.qpa.xcb: could not connect to display :1
Authorization required, but no authorization protocol specified
```

原因是 X11 默认只允许当前登录用户访问，容器里的 root 不在白名单里。

解决办法是在**宿主机**执行一次：

```bash
xhost +SI:localuser:root
```

输出 `localuser:root being added to access control list` 就成功了，然后重新进容器启动 RViz，就能正常显示。

这条命令的作用是精确放行本机 root，比 `xhost +`（放行所有来源）安全。缺点是**重启后会失效**，下次开机再执行一遍即可。

## 八、这套方案的成本

用了几天，客观说一下问题：

**代价一：图形界面是"半个"体验。** RViz、Gazebo 能显示，但没有 GPU 直通，渲染走的是软件光栅化。日志里那几行 `libGL error: failed to create dri3 screen` 就是这个原因。看关节运动够用，跑重图形仿真会卡。

**代价二：两套环境容易混。** 宿主机终端是 Jazzy，容器里是 Humble，`source` 错一次就会出现"找不到包"或者版本不一致的怪问题。习惯是：涉及比赛的命令，一律先确认提示符里是容器。

**代价三：镜像会越来越大。** 装完 desktop 版已经 5GB 出头，后面再装仿真依赖还会涨。

但换来的是：**宿主机干干净净，Jazzy 一点没动，比赛环境随时能重建**。这笔账是划算的。

## 九、小结

整个流程真正的关键点只有四个：

1. 宿主机装 `docker-ce`，配 `registry-mirrors` 解决拉取问题；
2. 用 `ubuntu:22.04` 按官方文档装 Humble，`jammy` 代号不能写错；
3. `docker commit` 固化环境，避免重复安装；
4. 容器加 `--net=host`、`--ipc=host`、X11 挂载，再在宿主机 `xhost` 放行。

剩下的都是重复劳动。真正花时间的不是命令本身，而是**不知道问题出在哪**——比如镜像拉不动会误以为是网络坏了，RViz 起不来会误以为是装错了包。
