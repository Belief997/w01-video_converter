import struct
import os
from bitstring import BitStream

class H264Header:
    def __init__(self, width, height, frame_num, fps, size):
        self.symbol = b"H264"
        self.width = width
        self.height = height
        self.frame_num = frame_num
        self.frame_time = round(1000/fps)
        self.size = size

    def pack(self):
        # Debugging: Check all values being packed
        print(f"Symbol: {self.symbol}")
        print(f"Width: {self.width}")
        print(f"Height: {self.height}")
        print(f"Frame Count: {self.frame_num}")
        print(f"Frame Time: {self.frame_time}")
        print(f"Size: {self.size}")
        
        return struct.pack('<4s5I', self.symbol, self.width, self.height, self.frame_num, self.frame_time, self.size)


def find_start_code(data, start=0):
    code_3 = b'\x00\x00\x01'
    code_4 = b'\x00\x00\x00\x01'
    pos = data.find(code_3, start)
    if pos == -1:
        pos = data.find(code_4, start)
        if pos == -1:
            return len(data)
    return pos


def parse_sps(sps_data):
    bit_stream = BitStream(bytes=sps_data)

    # Skip to start of SPS
    bit_stream.bytepos = 1  # Skip the NAL unit type byte

    profile_idc = bit_stream.read('uint:8')
    level_idc = bit_stream.read('uint:8')

    print(f"Profile: {profile_idc}, Level: {level_idc}")

    seq_parameter_set_id = bit_stream.read('ue')

    # Profile condition according to H.264 standard profiles
    if profile_idc in [100, 110, 122, 244]: 
        chroma_format_idc = bit_stream.read('ue')
        if chroma_format_idc == 3:
            separate_colour_plane_flag = bit_stream.read('uint:1')

        bit_depth_luma_minus8 = bit_stream.read('ue')
        bit_depth_chroma_minus8 = bit_stream.read('ue')

        bit_stream.read('uint:1')  # qpprime_y_zero_transform_bypass_flag
        seq_scaling_matrix_present_flag = bit_stream.read('uint:1')

        # Skipping scaling lists in this minimal example
        if seq_scaling_matrix_present_flag:
            # Appropriate scaling list processing logic here
            pass

    log2_max_frame_num_minus4 = bit_stream.read('ue')
    pic_order_cnt_type = bit_stream.read('ue')
    if pic_order_cnt_type == 0:
        log2_max_pic_order_cnt_lsb_minus4 = bit_stream.read('ue')
    elif pic_order_cnt_type == 1:
        bit_stream.read('uint:1')  # delta_pic_order_always_zero_flag
        bit_stream.read('se')      # offset_for_non_ref_pic
        bit_stream.read('se')      # offset_for_top_to_bottom_field
        num_ref_frames_in_pic_order_cnt_cycle = bit_stream.read('ue')
        for _ in range(num_ref_frames_in_pic_order_cnt_cycle):
            bit_stream.read('se')  # offset_for_ref_frame
    
    max_num_ref_frames = bit_stream.read('ue')
    bit_stream.read('uint:1')  # gaps_in_frame_num_value_allowed_flag

    pic_width_in_mbs_minus1 = bit_stream.read('ue')
    pic_height_in_map_units_minus1 = bit_stream.read('ue')

    frame_mbs_only_flag = bit_stream.read('uint:1')
    if not frame_mbs_only_flag:
        bit_stream.read('uint:1')  # mb_adaptive_frame_field_flag

    bit_stream.read('uint:1')  # direct_8x8_inference_flag

    frame_cropping_flag = bit_stream.read('uint:1')
    
    frame_crop_left_offset = 0
    frame_crop_right_offset = 0
    frame_crop_top_offset = 0
    frame_crop_bottom_offset = 0

    if frame_cropping_flag:
        frame_crop_left_offset = bit_stream.read('ue')
        frame_crop_right_offset = bit_stream.read('ue')
        frame_crop_top_offset = bit_stream.read('ue')
        frame_crop_bottom_offset = bit_stream.read('ue')

    # Calculating actual width and height
    width = ((pic_width_in_mbs_minus1 + 1) * 16) - (frame_crop_left_offset + frame_crop_right_offset) * 2
    height = ((2 - frame_mbs_only_flag) * (pic_height_in_map_units_minus1 + 1) * 16) - (frame_crop_top_offset + frame_crop_bottom_offset) * 2

    print(f"Calculated Width: {width}, Height: {height}")

    return max(0, width), max(0, height)

def skip_scaling_list(bit_stream, size):
    last_scale = 8
    next_scale = 8
    for i in range(size):
        if next_scale != 0:
            delta_scale = bit_stream.read('se')
            next_scale = (last_scale + delta_scale + 256) % 256
        last_scale = next_scale if next_scale != 0 else last_scale


def count_frames(data):
    frame_count = 0
    pos = 0

    while pos < len(data):
        start = find_start_code(data, pos)
        if start >= len(data):
            break
        nal_unit_type = data[start + 3] & 0x1F  # Assuming 4 byte start code.
        if nal_unit_type in (1, 5):  # Coded slice of non-IDR or IDR
            frame_count += 1
        pos = start + 4

    return frame_count

def add_header_to_h264(input_file_path, output_file_path, fps=24):
    # Read the entire file as bytes
    with open(input_file_path, "rb") as infile:
        h264_data = infile.read()

    # Find the SPS NAL unit
    pos = 0
    width, height = 0, 0

    while pos < len(h264_data):
        start = find_start_code(h264_data, pos)
        if start == len(h264_data):
            break
        nal_type = h264_data[start + 3] & 0x1F  # NAL unit type
        if nal_type == 7:  # SPS NAL unit
            # Parse SPS to get width and height
            next_start = find_start_code(h264_data, start + 4)
            sps_data = h264_data[start + 4:next_start]
            width, height = parse_sps(sps_data)
            break
        pos = start + 4

    # Count the number of frames in the file
    frame_num = count_frames(h264_data)

    # Calculate size excluding the header
    size = len(h264_data)

    # Create the header
    header = H264Header(width, height, frame_num, fps, size)

    # Pack the header
    packed_header = header.pack()

    # Write the header and original H.264 data to the output file
    with open(output_file_path, "wb") as outfile:
        outfile.write(packed_header)
        outfile.write(h264_data)

if __name__ == "__main__":
    # Example usage
    input_file = "cast_demo_400_496.h264"  # 输入的 H.264 文件路径
    output_file = "cast_demo_400_496_header.h264"
    fps = 24
    
    # 将头添加到 H.264 文件中
    add_header_to_h264(input_file, output_file, fps)

    print(f"Header added and file saved as {output_file}")
