---
title: Label Studio 使用教程：从安装到标注的完整指南
slug: label-studio-usage
description: Label Studio 是一个开源的多模态数据标注平台，本文介绍它的用途、安装方法、标注流程及多人协作方式。
publishedAt: 2026-10-09
category: 工具
tags: [Label Studio, 数据标注, YOLOv8, 教程]
draft: false
---

# Label Studio 使用教程：

## 一、Label Studio 是用来干什么的：

Label Studio 是一个 开源的数据标注平台 ，简单说就是"给 AI 准备教材的工具"——用来给图片、视频、音频、文本等各种数据"标答案"，让机器学习模型能照着学。

**它具体能干什么**：

给图像画框、画轮廓、点关键位置。 在一张图片上，你可以用矩形框标出"这里是烧杯、那里是锥形瓶"，也可以用多边形沿物体边缘画出精确轮廓（分割任务），或者在人体关节上点出关键点（姿态识别任务）。

给视频逐帧标注。 视频的每一帧都可以画框、标跟踪轨迹，常用于自动驾驶、行为识别这类需要时序信息的任务。

给音频转写、给文本分类。 把一段语音抄成文字、给一句话打情感标签，都能在一个平台里完成。

让训练好的模型回来"帮忙标"。 这是它的高阶用法：把你已经训练好的 best.pt 接进 Label Studio，下次导入新图片时，模型会先自己预测一遍框，你只需要修正它标错的那几个，不用从头画。这叫"AI 辅助预标注"，能让你补数据时的效率翻倍。

## 二、为什么要使用Label Studio标注数据而不是其他工具：

### 1、主流标注工具横向对比

当前主流标注工具按形态可分为三类。桌面软件类包括 LabelImg 和 Labelme，前者仅支持矩形框标注，双击即用，适合纯目标检测的快速 Demo；后者支持多边形与关键点，但导出 YOLO 格式需自行编写转换脚本。Web 自部署类包括 Label Studio 和 CVAT，两者均支持团队协作与 AI 预标注，Label Studio 多模态覆盖更广、部署更轻，CVAT 在视频帧跟踪与大规模团队流水线方面更专业。在线平台类包括 Roboflow 和 Labelbox，前者提供一站式"标注—增强—训练"流水线但数据需上传其云端服务器，后者是商业 SaaS、企业级合规但按使用量收费。

### 2、Label Studio 的适用场景

- #### 场景一：单人/小团队的视觉研究项目

典型如学生课题、毕业设计、实验室小项目。数据量在几十到几千张，标注者 1~3 人。需要从检测、分割到关键点逐步扩展任务类型，但不希望每换一种任务就学一套新工具。

- #### 场景二：数据敏感、不可上传云端

医疗影像、工业质检、实验室内部数据、机器人场景采集数据等，受合规或保密要求不能上传第三方平台。必须本地部署、数据不出本机。

- #### 场景三：需要构建"标注—训练—修正"主动学习闭环

已有初版模型，希望用模型对新数据预标注、人工只修正错误样本，迭代提升数据质量与模型精度。Label Studio 内置 ML Backend 接口，可直接接入自训练模型形成闭环。

- #### 场景四：多模态标注需求

同一项目内既有图像检测，又有语音指令转写、视频片段分割等任务。希望用统一工具管理所有标注资产，而不是每种模态各装一套。

### 3、Label Studio 的核心优势

#### ①. 全任务类型覆盖，一次学习长期复用

Label Studio 支持目标检测框、实例分割多边形、语义分割画笔、关键点、图像分类、视频帧跟踪、OCR 文本、音频转写等十余种任务。标注者只需学习一套操作逻辑（建项目 → 配置模板 → 标注 → 导出），即可覆盖视觉项目从入门到进阶的全部标注需求，避免因任务演进而频繁迁移工具。

#### ②. 原生 YOLO 格式导出，零转换成本

在 Export 面板选择 "YOLO with images" 即可下载标准 zip 包，解压后即`images/` +`labels/` 平行目录，每图一个同名`.txt` ，每行`类别号 x y w h` 归一化坐标，可直接作为训练输入。无需编写格式转换脚本，也无需手动拆分训练/验证集。

#### ③. 自部署架构，数据全程不出本机

Label Studio 通过`pip install label-studio` 安装，启动后在本地 8080 端口提供 Web 服务，浏览器访问进行标注。图片存储在本地文件系统，不上传任何第三方服务器。既满足数据安全合规要求，又规避了商业平台按量收费的成本问题，对学生和科研用户无门槛。

#### ④. AI 辅助预标注，形成主动学习闭环

Label Studio 支持连接外部模型作为 ML Backend：将已训练的 YOLO 权重接入后，新数据导入时模型自动预测预标注框，人工仅需修正错误样本而非从零标注。这一机制使"标注 → 训练 → 预标注 → 修正 → 再训练"的主动学习循环成为可能，在补充长尾类别数据时效率提升显著。

#### ⑤. 多人协作与版本管理

支持多用户注册与权限分配，标注任务可分配给不同成员并行进行；每次标注自动记录修改历史，便于回溯与审核。对小团队协作标注同一数据集的场景提供了基础工程化能力。

#### 6. 开源免费、社区活跃

Label Studio 在 GitHub 开源（Apache 2.0 协议），Star 数过万，社区持续更新。无需付费即可使用全部核心功能，且遇到问题可通过 Issue 和文档获得支持，不依赖商业供应商。

### 4、与其他工具的差异化定位

![image-20261009093652288](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009093652288.png)

### 5、选型结论

需求特征 推荐工具 纯检测 Demo、几十张图、最快上手 LabelImg 大规模视频跟踪、专业团队流水线 CVAT 数据不敏感、想白嫖云端增强与训练 Roboflow 企业生产、付费合规 Labelbox 学习/科研全周期、多任务、数据本地、主动学习闭环 Label Studio

本项目（实验室物品 YOLOv8 检测）属于"学生科研全周期"需求：需要原生 YOLO 导出、数据不可外传、后续可能扩展分割与关键点任务、且希望将 best.pt 接回形成预标注闭环。综合对比，Label Studio 是唯一能同时满足上述全部诉求的开源工具，故选其作为标注平台。

## 三、Label Studio如何安装：

Label Studio 的安装分两步：先有 Python 环境，再 pip 装。

### 1、环境要求

操作系统 ：Windows 10/11、macOS、Linux 均可，你用的 Windows 11 完全没问题。

Python 版本 ：要求 Python 3.8+（推荐 3.10~3.12） 。不建议用 3.13，部分依赖还没适配好。

### 2、安装方法（推荐pip方式）

打开 PowerShell（不需要管理员权限），执行一行命令：

```
D:\dev\python.exe -m pip install label-studio
```

等 2~5 分钟，看到`Successfully installed label-studio-x.x.x` 即成功。

### 3、首次启动

在终端中执行以下命令启动 Label Studio：

label-studio start

启动后，终端会显示如下信息：

Label Studio is starting at http://localhost:8080

等10秒左右，Label Studio会自动在浏览器打开，没自动开就手动输入`http://localhost:8080` ），进入注册页—— 注册一个本地账号 （数据存你本机，账号只是登录凭证，邮箱随便填、密码自己设）。

## 四、Label Studio使用方法（讲YOLOV8，其他使用方法详情见文章末尾链接）：

1.安装好后终端输入

```
label-studio start
```

启动，首次使用需要创建一个账号；

2.创建项目：

点击蓝色图标create创建新项目，会弹出一个窗口，开始编辑项目名称、描述、导入图片：

project name输入项目名称，不输入也不影响使用

![image-20261009090601024](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009090601024.png)

data import导入图片，把图片拖进去就行，一次最大保存100张，可以连续多次拖入

![image-20261009090759139](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009090759139.png)

导入图片后点击labeling setup选择标注类型，YOLOv8选择第三个图片即Object Detection with Bounding Boxes：

![image-20261009090952649](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009090952649.png)

删除原有标签，两个都删除

![d0cdd57e2abf745bef7720cdd06b4bd2](E:\文档\QQ记录\Tencent Files\3328407396\nt_qq\nt_data\Pic\2026-10\Ori\d0cdd57e2abf745bef7720cdd06b4bd2.png)

添加标签，想要标注几个类就添加几个标签，输入标签名称，点击add添加，如果有多个类，接着输入名称，add添加，添加完所有类标签之后，再点击save进行保存，save键也可能在图片下方

![3971fb613fa94e8f59803855880ae95f](E:\文档\QQ记录\Tencent Files\3328407396\nt_qq\nt_data\Pic\2026-10\Ori\3971fb613fa94e8f59803855880ae95f.png)

保存之后点击图片开始进行标注，标注时要尽量贴合目标，如图所示，一个类物体要使用同一类标签，比如three-neck flask是标签1,代表三颈烧瓶，标签raduated cylinder是标签2，代表量筒，标签快捷键是1、2、3，如果标错，点击图片中方框，点击回退键删除，一张图片标注完成后点击下方submit键进行提交，图片会自动跳转到下一张，接着标注

![image-20261009092743990](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009092743990.png)

全部标注完成后，返回上一界面，右上角Export进行导出

![image-20261009093213372](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009093213372.png)

向下翻，选择YOLO with Images，翻到最下面，点击export进行导出，图片标注流程全部完成！！！

![image-20261009093301714](C:\Users\lenovo\AppData\Roaming\Typora\typora-user-images\image-20261009093301714.png)

其他使用方法：[【AI数据标注】企业标注流程及label studio打标工具介绍_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1oRxteFEJi/?spm_id_from=333.1391.0.0&vd_source=b02af3695c28eeeb6f52a8c37bf451ce)

## 五、Label Studio多人协作开发

核心机制：一个服务器 + 多账号 + 任务分配

`你的电脑（或团队服务器）跑 label-studio
            ↓ 局域网内网 IP 访问
    队员A   队员B   队员C   队员D
    浏览器   浏览器   浏览器   浏览器`

一人`python -m label_studio` 启动服务当"主机"，其他人浏览器访问你的 IP（如`http://192.168.1.100:8080` ）注册账号即可加入。

三个协作功能：

多账号注册： 每人独立邮箱+密码注册，标注归属到自己名下 ；

任务分配： 项目设置里把图片批量分配给指定成员，每人只标自己那份，避免重复 ；

角色权限： Owner（你）/ Manager / Reviewer / Annotator 四种角色，Annotator 只能标不能改别人的

简单上手步骤：

1. 主机 ：`python -m label_studio --host 0.0.0.0` （关键：`0.0.0.0` 允许外部访问，不是`127.0.0.1` ）；
2. 创建项目 + 上传图片 ；
3. 邀请成员 ：复制项目链接发给队友，他们注册即可；
4. 分配任务 ：Settings → Members → 给每人分 N 张图；
5. 审核 ：你（Reviewer）逐张检查标注质量，不合格打回重标。

三个注意点：

- 同 WiFi 才行 ：默认只能局域网协作，异地协作要内网穿透（cpolar/frp）或部署到云服务器；
- 数据在你电脑 ：所有标注结果存在主机本地，队友只是远程操作，不存他们的电脑——这是自部署的优势；
- 断网风险 ：你电脑关机大家就停工——所以正式项目建议部署到团队服务器或云主机。
