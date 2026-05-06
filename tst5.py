import struct
import math

def left_rotate(x, c):
    return ((x << c) | (x >> (32 - c))) & 0xFFFFFFFF

def md5(message):
    message = bytearray(message, 'utf-8')
    original_len_bits = (8 * len(message)) & 0xffffffffffffffff
    message.append(0x80)
    
    while (len(message) * 8) % 512 != 448:
        message.append(0)
    
    message += struct.pack('<Q', original_len_bits)
    
    A = 0x67452301
    B = 0xefcdab89
    C = 0x98badcfe
    D = 0x10325476
    
    K = [int(abs(math.sin(i + 1)) * (2**32)) & 0xFFFFFFFF for i in range(64)]
    
    s = [7, 12, 17, 22] * 4 + \
        [5, 9, 14, 20] * 4 + \
        [4, 11, 16, 23] * 4 + \
        [6, 10, 15, 21] * 4
    
    for i in range(0, len(message), 64):
        chunk = message[i:i+64]
        M = list(struct.unpack('<16I', chunk))
        a, b, c, d = A, B, C, D
        
        for j in range(64):
            if j < 16:
                f = (b & c) | (~b & d)
                g = j
            elif j < 32:
                f = (d & b) | (~d & c)
                g = (5 * j + 1) % 16
            elif j < 48:
                f = b ^ c ^ d
                g = (3 * j + 5) % 16
            else:
                f = c ^ (b | ~d)
                g = (7 * j) % 16
            
            temp = (a + f + K[j] + M[g]) & 0xFFFFFFFF  # Fixed: K[j] instead of K[i]
            temp = (left_rotate(temp, s[j]) + b) & 0xFFFFFFFF
            a, b, c, d = d, temp, b, c
        
        A = (A + a) & 0xFFFFFFFF
        B = (B + b) & 0xFFFFFFFF
        C = (C + c) & 0xFFFFFFFF
        D = (D + d) & 0xFFFFFFFF
    
    return ''.join('{:02x}'.format(x) for x in struct.pack('<4I', A, B, C, D))

# Test
msg = input("Enter message: ")
print("MD5:", md5(msg))