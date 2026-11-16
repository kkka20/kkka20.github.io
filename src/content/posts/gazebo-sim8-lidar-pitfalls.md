---
title: "Gazebo Sim 8 给 fishbot 加激光雷达：从跟着课程敲到自己搞明白"
slug: gazebo-sim8-lidar-pitfalls
description: 课程用的是 Gazebo Classic，本机装的是 Gazebo Sim 8，一节激光雷达仿真课我踩了一连串版本差异的坑。把 ray 改成 gpu_lidar、把插件名换掉、把警告和错误分开看，最后让 fishbot 在 RViz 里看到一圈 /scan。
publishedAt: 2026-11-16
category: ROS
tags: [Gazebo, ROS2, 仿真, 激光雷达]
draft: false
---

# Gazebo Sim 8 给 fishbot 加激光雷达：从跟着课程敲到自己搞明白

> 前言：最近在补 ROS2 的 Gazebo 仿真课。前面 URDF、xacro、ros2_control 都跟下来了，到「6.4.5 激光雷达传感器仿真」这一节卡了我整整一个下午——不是听不懂，是**课程里写的标签我照抄进去，Gazebo 直接装死不认**。折腾完之后我才搞明白，问题不在我，在课程用的 Gazebo Classic 和我本机的 Gazebo Sim 8 是两个不一样的东西。这篇把这过程记下来，顺便把"Classic 写法怎么翻译成 Sim 写法"这条映射整理出来，下次再踩类似的坑能快一点。

## 一、先把环境信息亮出来

踩坑这件事特别吃环境，同一句话在不同版本上含义完全不同。先交代清楚我这一台机器的状态：

| 项目 | 版本/说明 |
| --- | --- |
| 操作系统 | Ubuntu 24.04 LTS |
| ROS 发行版 | ROS2 Jazzy |
| Gazebo | Gazebo Sim 8（也就是原来的 Ignition Gazebo，新版改名叫 Sim） |
| 课程用的 Gazebo | Gazebo Classic 11 |
| 桥接方式 | `ros_gz_bridge` 的 `parameter_bridge` |
| 机器人模型 | fishbot（自己用 xacro 拼的两轮差速小车） |

**最关键的一条：课程讲的是 Classic 11，我装的是 Sim 8，两者从底层架构到 SDF 标签都不一样。** 我一开始完全没意识到这件事，直到撞墙了才回头查。

## 二、坑 1：照抄课程的 `<ray>` 标签，Gazebo 直接装死

课程里给 fishbot 加激光雷达是这么写的（大意）：

```xml
<link name="laser_link">
  <sensor name="laser" type="ray">
    <ray>
      <scan>
        <horizontal>
          <samples>360</samples>
          <min_angle>-3.14159</min_angle>
          <max_angle>3.14159</max_angle>
        </horizontal>
      </scan>
      <range>
        <min>0.12</min>
        <max>3.5</max>
      </range>
    </ray>
    <plugin name="laser_controller" filename="libgazebo_ros_ray_sensor.so">
      <ros>
        <namespace>/fishbot</namespace>
      </ros>
      <output_type>sensor_msgs/LaserScan</output_type>
      <frame_name>laser_link</frame_name>
    </plugin>
  </sensor>
</link>
```

我把这段几乎原封不动地塞进 fishbot 的 xacro 里，保存，启动 launch，然后就看到——什么都没发生。Gazebo 起来了，fishbot 出来了，但 `ros2 topic list` 里**根本没有 `/scan`**，RViz 里 LaserScan 一加就报 "No messages received"。

我当时的反应是怀疑自己：是不是 xacro 没展开对？是不是 launch 文件里 robot_state_publisher 没起来？是不是 topic 名被 namespace 改了？一个个查过去，全部正常。

直到我去翻 Gazebo Sim 8 的官方文档，才看到一行小字——**Sim 里 `<sensor type="ray">` 已经被弃用了，对应的类型叫 `gpu_lidar`**。课程用的 `libgazebo_ros_ray_sensor.so` 是 `gazebo_ros_pkgs` 里的插件，那个仓库是给 Classic 写的，Sim 这边对应的是 `ros_gz` 系列包，根本不是一回事。

那一刻我才明白过来：不是我没配对，是**我写的这一段 XML 在 Sim 8 眼里就是个不认识的标签**，Gazebo 启动时遇到不认识的 sensor type，默认行为是忽略而不是报错——所以看起来"什么反应都没有"。

教训：跟着老教程写传感器时，**先确认目标 Gazebo 版本支不支持这个 sensor type**。Sim 不支持的标签它会静默跳过，不像 C++ 编译错还会报错告诉你。

## 三、坑 2：改成 `<lidar>` + `gpu_lidar`，但桥接没配

把课程那段重写成 Sim 8 认识的版本：

```xml
<link name="laser_link">
  <sensor name="laser" type="gpu_lidar">
    <topic>scan</topic>
    <update_rate>10</update_rate>
    <lidar>
      <scan>
        <horizontal>
          <samples>360</samples>
          <resolution>1</resolution>
          <min_angle>-3.14159</min_angle>
          <max_angle>3.14159</max_angle>
        </horizontal>
      </scan>
      <range>
        <min>0.12</min>
        <max>3.5</max>
        <resolution>0.015</resolution>
      </range>
    </lidar>
    <always_on>true</always_on>
    <visualize>true</visualize>
  </sensor>
</link>
```

变化点总结一下：

- **`<sensor type>`**：`ray` → `gpu_lidar`
- **子标签**：`<ray>` → `<lidar>`
- **必须加 `<topic>`**：Sim 不像 Classic 那样靠插件隐式建 topic，它靠这个字段决定把数据发到哪个 Gazebo Transport 话题上
- **不需要插件了**：Classic 那种 `libgazebo_ros_ray_sensor.so` 在 Sim 里直接删掉，改用 `ros_gz_bridge` 把 Gazebo Transport 话题桥到 ROS 话题

改完之后 `ros2 topic list` 里**还是没有 `/scan`**。这次我没慌，去查 Gazebo Transport 那侧：

```bash
gz topic -l
```

果然看到了 `/scan` 出现在 Gazebo Transport 的话题列表里——说明传感器这一侧已经正常工作了，问题出在"Gazebo Transport → ROS2"这座桥没搭。

打开 launch 文件加上桥接：

```python
Node(
    package='ros_gz_bridge',
    executable='parameter_bridge',
    arguments=['/scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan'],
    output='screen'
)
```

注意这里参数里那个中括号的方向——`[` 表示**从 Gazebo 往 ROS 单向桥**，`]` 是反向，`@...@...@` 是双向。我第一次写成了 `]`，结果 ROS 端能发但收不到 Gazebo 的数据，又 debug 了一会儿才发现。

启动之后 `ros2 topic echo /scan` 终于能看到数据流了，RViz 里也能看到一圈激光点云。那一刻差点在椅子上坐直了。

教训：Gazebo Sim 的设计是**先把数据发布到 Gazebo Transport 自己那套通信系统，再靠 `ros_gz_bridge` 显式桥到 ROS**。这个两步走的链路比 Classic 的插件直连要长，每一步都可能单独出问题，排错时要学会分侧看：先看 `gz topic -l`，再看 `ros2 topic list`。

## 四、坑 3：把警告当错误，浪费半小时

调试过程中终端里疯狂刷这两种日志：

```
[Wrn] [SystemPaths.cc:...] [gz_frame_id] not defined in SDF, ...
```

```
libEGL warning: failed to open /dev/dri/...
```

一开始我以为这两个就是"为什么没数据"的罪魁祸首，沿着它们的字面意思去查 SDF、去查 EGL、去查显卡驱动。折腾半天发现：

- **`gz_frame_id ... not defined in SDF`** 这条是 `ros_gz_bridge` 提示你没显式指定 frame_id，它会用 link 名字兜底。**这是提示不是错误**，数据照样能流。
- **`libEGL warning`** 是 Gazebo 在无显示环境下尝试用 EGL 渲染时的小警告，跟传感器数据无关，可以无视。

教训：Gazebo 的日志输出很啰嗦，**Wrn 级别不一定影响功能**，但 Err 级别一定要看。我后面养成了习惯——先把日志按级别过滤一遍，别看到红字就紧张。

```bash
gz sim shapes.sdf 2>&1 | grep -E "\[Err\]"
```

只筛错误级别的输出，瞬间清爽。

## 五、坑 4：后台残留的 Gazebo server 让机器人"消失"

这是最诡异的一个坑，卡了我最久。

有一天我启动 launch，Gazebo 客户端起来了，world 加载了，地面、墙都在，**但是 fishbot 没在世界里**。Entity Tree 里翻遍了都找不到 fishbot 的影子。

我查 launch 文件没问题、URDF 没问题、spawn 命令没报错，但 fishbot 就是不在。重启 launch 也没用。

后来无意间用 `ps aux | grep gz` 看了一下，**发现机器上跑着两个 `gz sim server`**——一个是我以为关掉的旧进程，一个是新启动的。新启动的 Gazebo 客户端连到了旧 server 上，而 fishbot 被 spawn 到了新 server 的世界里。两个 server 各自维护一个独立的世界，自然看不到彼此的实体。

```bash
ps aux | grep gz
# 找到残留进程
pkill -f "gz sim"
# 全部清掉，再重启 launch
```

教训：Gazebo Sim 的 server / client 是分离架构，**关 GUI 窗口不会自动关 server**。改完 URDF 或者 launch 之后，最好养成习惯 `pkill -f "gz sim"` 一次再启动，省得旧世界和新世界串台。

## 六、把这次踩坑整理成一张映射表

课程是 Classic、本机是 Sim，这种情况在 ROS2 学习里特别常见。把这次用到的对应关系整理一下：

| 概念 | Gazebo Classic | Gazebo Sim 8 |
| --- | --- | --- |
| 激光传感器类型 | `ray` | `gpu_lidar`（或 `cpu_lidar`） |
| 激光子标签 | `<ray>` | `<lidar>` |
| 传感器插件 | `libgazebo_ros_ray_sensor.so` | 不需要插件，用 `<topic>` 声明 |
| ROS 桥接方式 | 插件直连 | `ros_gz_bridge` / `parameter_bridge` |
| 差速控制插件 | `libgazebo_ros_diff_drive.so` | `gz-sim-diff-drive-system` |
| IMU 插件 | `libgazebo_ros_imu_sensor.so` | `gz-sim-imu-system` |
| 时钟桥接 | 插件自带 | 单独桥 `/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock` |
| 服务进程 | `gzserver` | `gz sim server` |
| GUI 进程 | `gzclient` | `gz sim gui` |

下次再碰到"课程里的标签我照抄进去没反应"，**先对照这张表查一遍**，八成能找到答案。

## 七、几个我会反复用到的命令

这次踩坑下来，有几条命令用得特别多，记下来：

```bash
# 看 Gazebo Transport 那侧的话题
gz topic -l

# 看某个话题的数据（用于确认传感器有没有真的在发）
gz topic -e -t /scan

# 看所有运行中的 Gazebo 进程
ps aux | grep gz

# 一键清场
pkill -f "gz sim"

# 只看错误级别的日志
gz sim shapes.sdf 2>&1 | grep "\[Err\]"

# 验证 URDF 结构没坏
check_urdf fishbot.urdf

# 看 ROS 侧话题
ros2 topic list | grep scan
ros2 topic hz /scan
ros2 topic echo /scan --once
```

## 八、写这篇的收获

这次踩坑最大的收获不是"学会了怎么写 lidar 标签"，而是**学会了怎么在 Gazebo 这种重型仿真器里排错**。

排错的核心思路是**把链路拆成段、每段独立验证**。Gazebo Sim 的传感器数据要走这么长一条路：URDF 定义 → Gazebo 加载 sensor → 物理仿真算出原始数据 → 发布到 Gazebo Transport → `ros_gz_bridge` 桥接 → ROS2 话题 → RViz 显示。任何一段出问题，最终现象都是"RViz 里没数据"。但只要你每段都去看一眼——`check_urdf` 看 URDF、`gz topic -l` 看 Gazebo Transport、`ros2 topic list` 看 ROS 侧——就能很快定位是哪一段出问题。

另一个收获是**对"版本差异"这件事的警惕**。ROS 生态里同一个名字的东西可能有多个不兼容的版本，跟着教程敲之前先确认一下版本对应关系，能省掉非常多无意义的挣扎。我现在看任何 ROS 教程都会先看它写的 ROS 发行版和 Gazebo 版本，对不上就直接找新版本对应的写法，不再死磕老教程。

最后想说，仿真这件事本身特别有价值——不用买硬件就能验证导航、验证传感器、验证算法。Gazebo Sim 虽然踩坑多，但踩过去之后它就是个极其强大的工具。下一篇想写 MoveIt2 在 Sim 8 里做机械臂仿真的踩坑，那个坑比 lidar 还要更深一层。
