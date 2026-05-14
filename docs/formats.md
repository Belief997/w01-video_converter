# 输出格式规范

所有格式规范来自 [`script/spec_v4.txt`](../script/spec_v4.txt)。

---

## MJPEG 格式

连续的 JPEG 帧，直接拼接：

```
[JPEG帧1: 0xFFD8...0xFFD9] [JPEG帧2: 0xFFD8...0xFFD9] ...
```

- 每帧以 SOI 标记 `0xFFD8` 开始，EOI 标记 `0xFFD9` 结束
- 仅包含 Baseline JPEG（SOF0）
- 像素格式：`yuvj420p`

---

## AVI-MJPEG 格式

标准 RIFF AVI 容器，所有视频帧数据 **8 字节对齐**：

```
RIFF AVI
  ├─ LIST hdrl  (文件头)
  │    ├─ avih  (AVI 主头)
  │    └─ LIST strl (流信息)
  │         ├─ strh  (流头)
  │         └─ strf  (流格式)
  ├─ JUNK       (填充对齐块，可选)
  ├─ LIST movi  (媒体数据)
  │    ├─ 00dc  (视频帧1，8字节对齐)
  │    ├─ 00dc  (视频帧2，8字节对齐)
  │    └─ ...
  └─ idx1       (索引块)
```

**对齐规则：**
- 每个 `00dc` 数据块从文件起始计算的偏移需满足 8 字节对齐
- 通过 JUNK 块和 JPEG APP1 段填充实现对齐
- 不包含音频流（`-an`）

---

## H264 格式

32 字节自定义头部 + H264 裸流：

```
偏移  大小  字段
0     4     魔术标记
4     4     版本
8     4     宽度（像素）
12    4     高度（像素）
16    4     总帧数
20    4     帧时间（微秒，= 1_000_000 / fps）
24    8     保留
32+   ...   H264 裸流数据（NALU 格式）
```

编码参数：`libx264`，通过 `x264-params` 传入，无音频，`-f rawvideo`。

---

## JPEG 二进制格式（.bin）

用于嵌入式 GUI 系统，完整文件结构：

```
字节      大小  字段
0         1     位字段字节（scan[0], align[1], resize[2:3], compress[4], jpeg[5], idu[6], rsvd[7]）
1         1     type = 0x0C（JPEG 类型标识）
2-3       2     宽度（uint16，小端序）
4-5       2     高度（uint16，小端序）
6         1     version = 0x00
7         1     rsvd2 = 0x00
8-11      4     JPEG 数据大小（uint32，小端序，从 0xFFD8 计算）
12-15     4     dummy = 0x00000000（对齐用）
16+       N     JPEG 数据（从 0xFFD8 开始）
```

**Spec v4 严格约束：**
> `gui_rgb_data_head_t` 填充 `type`、`w`、`h`，**其余字段全为 0**。

C 结构体定义（来自 spec_v4.txt）：

```c
typedef struct gui_rgb_data_head {
    unsigned char scan    : 1;
    unsigned char align   : 1;
    unsigned char resize  : 2;
    unsigned char compress: 1;
    unsigned char jpeg    : 1;
    unsigned char idu     : 1;
    unsigned char rsvd    : 1;
    char     type;      // JPEG = 12
    short    w;
    short    h;
    char     version;
    char     rsvd2;
} gui_rgb_data_head_t;

typedef struct gui_jpeg_file_head {
    gui_rgb_data_head_t img_header;
    uint32_t size;   // JPEG 文件大小，从 0xFFD8 起计
    uint32_t dummy;  // 对齐用，固定为 0
    uint8_t  jpeg[1024];
} gui_jpeg_file_head_t;
```

参考输出头部示例（十六进制）：
```
000c 4800 4800 0000 0507 0000 0000 0000 ffd8 ffe0
```

---

## 支持的图片采样格式

| 参数值 | FFmpeg 像素格式 | 说明 |
|--------|-----------------|------|
| `400`  | `gray`          | 灰度 |
| `420`  | `yuvj420p`      | 4:2:0（推荐，文件最小） |
| `422`  | `yuvj422p`      | 4:2:2（中等质量） |
| `444`  | `yuvj444p`      | 4:4:4（最高质量） |
