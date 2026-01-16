import struct
import os

try:
    import tkinter as tk
    from tkinter import filedialog
except:
    tk = None

def choose_file():
    if tk:
        root = tk.Tk()
        root.withdraw()
        file_path = filedialog.askopenfilename(filetypes=[('AVI files', '*.avi'), ('All files', '*')])
        return file_path
    else:
        return input("请输入 avi 文件全路径: ")

def read_chunk_header(f, offset):
    f.seek(offset)
    header = f.read(8)
    if len(header) < 8:
        return None, None, None
    chunk_id, size = struct.unpack('<4sI', header)
    return chunk_id.decode('ascii', errors='replace'), size, offset + 8

def parse_idx1(f, data_start, size, indent=""):
    f.seek(data_start)
    entry_count = size // 16  # 每项16字节
    print(f"{indent}idx1内容，共 {entry_count} 项 (每项16字节):")
    print(f"{indent}{'Idx':>4} | {'ChunkID':>6} | {'Flags':>6} | {'Offset':>10} | {'Size':>8}")
    print(f"{indent}" + "-" * 47)
    for i in range(entry_count):
        entry = f.read(16)
        if len(entry) < 16:
            break
        chunk_id, flags, offset, length = struct.unpack('<4sIII', entry)
        print(f"{indent}{i:4d} | {chunk_id.decode('ascii',errors='replace'):>6} | 0x{flags:04X} | 0x{offset:08X} | {length:8d}")

def parse_chunks(f, offset, end, movi_offset=None, level=0):
    while offset + 8 <= end:
        chunk_id, size, data_start = read_chunk_header(f, offset)
        if chunk_id is None:
            break
        indent = "  " * level
        # 处理 RIFF / LIST
        if chunk_id in ["RIFF", "LIST"]:
            f.seek(data_start)
            form_type = f.read(4).decode('ascii', errors='replace')
            print(f"{indent}[{chunk_id}] @0x{offset:08X}, size:{size:8d}, type:{form_type}")
            new_movi_offset = movi_offset
            # 记录movi块的文件偏移
            if form_type == "movi":
                new_movi_offset = data_start + 4
            parse_chunks(f, data_start + 4, offset + 8 + size, new_movi_offset, level + 1)
        else:
            print(f"{indent}{chunk_id:4} @0x{offset:08X}, size:{size:8d}")
            # 如果是 idx1，解析内容
            if chunk_id == "idx1":
                parse_idx1(f, data_start, size, indent + "  ")
        # 数据区实际存储为偶数字节对齐
        pad = size % 2
        offset += 8 + size + pad

def main():
    avi_file = choose_file()
    if not avi_file or not os.path.exists(avi_file):
        print("未选择文件或文件不存在。")
        return
    print(f"\n解析：{avi_file}\n")
    with open(avi_file, 'rb') as f:
        filesize = os.path.getsize(avi_file)
        parse_chunks(f, 0, filesize, level=0)

if __name__ == '__main__':
    main()

# log to file
# analysis_avi.py > .\AVI\an2_log.txt