Dalam rangka proses hukum terhadap Aperture Science, para penyidik mendapatkan akses terbatas ke fragmen-fragmen sistem internal fasilitas yang masih tersisa.

Salah satu artefak pertama yang ditemukan berasal dari subsistem kalibrasi dan tampaknya merujuk pada materi yang terkait dengan GLaDOS.


File yang Diberikan:

- ciphertext.txt - Berisi ciphertext dalam format hexadecimal
- encoder.py - Script enkripsi yang digunakan

Analisis encoder.py:
```
MOD = 1 << 32      # 2^32
A = 1664525        # Multiplier LCG
C = 1013904223     # Increment LCG

def keystream(seed, length):
    state = seed & 0xFFFFF  # Hanya 20 bit terbawah!
    out = bytearray()
    for _ in range(length):
        state = (A * state + C) % MOD
        out.append((state >> 24) & 0xFF)
    return bytes(out)

def encrypt(message: bytes, facility_seed: int) -> bytes:
    return xor_bytes(message, keystream(facility_seed, len(message)))
```
Jenis Kriptografi:
- Linear Congruential Generator (LCG) berbasis Stream Cipher
- Operasi XOR antara plaintext dan keystream

### Penalaran
Kelemahan Sistem:
1. Ruang Seed Kecil

- Seed hanya menggunakan 20 bit (seed & 0xFFFFF)
- Total kemungkinan: 2^20 = 1,048,576
- Ini sangat kecil dan memungkinkan brute force

2. Known Plaintext Attack

- Format flag diketahui: grodno{}
- Prefix grodno{ dapat digunakan sebagai known plaintext

3. Sifat XOR

- XOR bersifat simetris: plaintext = ciphertext XOR keystream
- Jika kita bisa menemukan seed, kita bisa regenerate keystream

### Pendekatan Solusi:
- Brute force semua kemungkinan seed (0 - 1,048,575)
- Untuk setiap seed, generate keystream untuk 7 byte pertama
- XOR dengan 7 byte pertama ciphertext
- Jika hasilnya grodno{, seed ditemukan
- Generate full keystream dan decrypt seluruh ciphertext

### Langkah Solusi
Step 1: Persiapan Data

```
# Ciphertext dari file
ciphertext_hex = "1b89ad17b196d415f519f17c9bfa709ac9a7a71605c6d91a7f08fcbb08c2833298388913e843bb0b8bd7bca262207fd861db5440715da4e2916b6245e450df243c6398e0c27fe8d83044b2a4100b83783e65fd27969f9a0adef8decede83339001f71e7fc83a3f7c415c0362d61a28d8d9e83970c840093a0fb6f0a1"

ciphertext = bytes.fromhex(ciphertext_hex)
```
Step 2: Implementasi Brute Force

```
MOD = 1 << 32
A = 1664525
C = 1013904223

def keystream(seed, length):
    state = seed & 0xFFFFF
    out = bytearray()
    for _ in range(length):
        state = (A * state + C) % MOD
        out.append((state >> 24) & 0xFF)
    return bytes(out)

def find_seed(ciphertext, known_prefix):
    max_seed = 1 << 20  # 1,048,576
    prefix_len = len(known_prefix)
    
    for seed in range(max_seed):
        ks = keystream(seed, prefix_len)
        decrypted_prefix = bytes(a ^ b for a, b in zip(ciphertext[:prefix_len], ks))
        
        if decrypted_prefix == known_prefix:
            return seed
    return None

# Cari seed
seed = find_seed(ciphertext, b"grodno{")
print(f"Seed ditemukan: {seed}")
```
Output:

```
Seed ditemukan: 369020
```
Step 3: Dekripsi Full Message

```
def decrypt(ciphertext, seed):
    ks = keystream(seed, len(ciphertext))
    return bytes(a ^ b for a, b in zip(ciphertext, ks))

plaintext = decrypt(ciphertext, seed)
print(plaintext.decode('utf-8'))
```
Output:
```
[Aperture Science Internal]
classification=stable
speaker=GLaDOS
memo=grodno{7h15_w45_4_7r1umph_bu7_7h3_533d_w45_700_5m4ll}
```

full script 
```
#!/usr/bin/env python3
"""
Aperture Science - GLaDOS Calibration Subsystem
LCG Stream Cipher Challenge Solver
"""

import re

# LCG Parameters
MOD = 1 << 32
A = 1664525
C = 1013904223

# Ciphertext from challenge
CIPHERTEXT_HEX = "1b89ad17b196d415f519f17c9bfa709ac9a7a71605c6d91a7f08fcbb08c2833298388913e843bb0b8bd7bca262207fd861db5440715da4e2916b6245e450df243c6398e0c27fe8d83044b2a4100b83783e65fd27969f9a0adef8decede83339001f71e7fc83a3f7c415c0362d61a28d8d9e83970c840093a0fb6f0a1"

def keystream(seed: int, length: int) -> bytes:
    """Generate keystream using LCG."""
    state = seed & 0xFFFFF
    out = bytearray()
    for _ in range(length):
        state = (A * state + C) % MOD
        out.append((state >> 24) & 0xFF)
    return bytes(out)

def xor_bytes(a: bytes, b: bytes) -> bytes:
    """XOR two byte arrays."""
    return bytes(x ^ y for x, y in zip(a, b))

def find_seed(ciphertext: bytes, known_prefix: bytes) -> int:
    """Brute force seed using known plaintext attack."""
    max_seed = 1 << 20
    prefix_len = len(known_prefix)
    
    print(f"[*] Brute forcing {max_seed} seeds...")
    
    for seed in range(max_seed):
        if seed % 10000 == 0:
            print(f"[*] Progress: {seed/max_seed*100:.1f}%", end='\r')
        
        ks = keystream(seed, prefix_len)
        if xor_bytes(ciphertext[:prefix_len], ks) == known_prefix:
            print(f"\n[+] Seed found: {seed}")
            return seed
    
    raise ValueError("Seed not found!")

def main():
    print("=" * 70)
    print("Aperture Science - GLaDOS Calibration Subsystem")
    print("LCG Stream Cipher Challenge Solver")
    print("=" * 70)
    
    # Load ciphertext
    ciphertext = bytes.fromhex(CIPHERTEXT_HEX)
    print(f"[+] Ciphertext loaded: {len(ciphertext)} bytes")
    
    # Find seed
    seed = find_seed(ciphertext, b"grodno{")
    
    # Decrypt
    ks = keystream(seed, len(ciphertext))
    plaintext = xor_bytes(ciphertext, ks)
    
    # Display result
    print("\n" + "=" * 70)
    print("[✓] DECRYPTED MESSAGE:")
    print("=" * 70)
    print(plaintext.decode('utf-8'))
    
    # Extract flag
    flag_match = re.search(r'grodno\{[^}]+\}', plaintext.decode('utf-8'))
    if flag_match:
        print("\n" + "=" * 70)
        print("🏴 FLAG:")
        print("=" * 70)
        print(flag_match.group())

if __name__ == "__main__":
    main()
```
