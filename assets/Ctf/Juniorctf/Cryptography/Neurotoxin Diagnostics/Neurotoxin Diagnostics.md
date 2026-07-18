### Ringkasan

Challenge ini mensimulasikan **CBC Padding Oracle Timing Attack**. Diberikan:

- `packet.hex` : IV + ciphertext AES-CBC
- `timing_trace.json` : hasil pengukuran waktu untuk setiap tebakan byte
- `metadata.json` : metadata challenge

Tujuan akhirnya adalah memperoleh plaintext yang berisi flag.

### Konsep

Pada AES-CBC berlaku:
```
P_i = D_K(C_i) XOR C_(i-1)
```

Padding oracle mengeksploitasi validasi PKCS#7. Pada challenge ini oracle tidak memberikan respon benar/salah secara langsung, tetapi **timing** berbeda ketika padding valid.

Untuk setiap blok:

1. Tebak satu byte.
2. Hitung rata-rata waktu dari seluruh sampel.
3. Byte dengan waktu rata-rata terbesar dianggap menghasilkan padding valid.
4. Dari sana dihitung intermediate value:
```
I = guess XOR padding
```
5. Plaintext:
```
P = I XOR previous_cipher_block
```

## Langkah Penyelesaian

1. Pisahkan IV dan ciphertext dari `packet.hex`.
2. Kelompokkan timing berdasarkan `(block, pad, guess)`.
3. Ambil guess dengan rata-rata waktu terbesar.
4. Rekonstruksi seluruh intermediate state.
5. XOR dengan blok sebelumnya.
6. Hapus PKCS#7 padding.

## Hasil

Plaintext:

```
text
diag=neurotoxin;
status=stable;
subject=chell;
memo=grodno{{n3ur070x1n_d14gn0571c5_l34k_7hr0ugh_71m1ng_4l0n3}};
closing=still_alive
```
source full 
```
p#!/usr/bin/env python3

import json
from collections import defaultdict

BLOCK_SIZE = 16


# --------------------------------------------------
# Load packet
# --------------------------------------------------

with open("packet.hex") as f:
    raw = bytes.fromhex(f.read().strip())

iv = raw[:BLOCK_SIZE]
ciphertext = raw[BLOCK_SIZE:]

cipher_blocks = [
    ciphertext[i:i+BLOCK_SIZE]
    for i in range(0, len(ciphertext), BLOCK_SIZE)
]

previous_blocks = [iv] + cipher_blocks[:-1]


# --------------------------------------------------
# Load timing trace
# --------------------------------------------------

with open("timing_trace.json") as f:
    trace = json.load(f)


# --------------------------------------------------
# Group timing samples
# --------------------------------------------------

samples = defaultdict(list)

for entry in trace:

    block = entry["block"]
    pad   = entry["pad"]
    guess = entry["guess"]

    # jika nama field berbeda, ganti di sini
    t = entry["elapsed_ns"]

    samples[(block, pad, guess)].append(t)


# --------------------------------------------------
# Compute average timing
# --------------------------------------------------

average = {}

for key, values in samples.items():
    average[key] = sum(values) / len(values)


# --------------------------------------------------
# Recover plaintext
# --------------------------------------------------

plaintext = bytearray()

num_blocks = len(cipher_blocks)

for block in range(1, num_blocks + 1):

    previous = previous_blocks[block - 1]

    intermediate = [0] * BLOCK_SIZE
    recovered = [0] * BLOCK_SIZE

    # pad = 1..16
    for pad in range(1, BLOCK_SIZE + 1):

        best_guess = None
        best_time = -1

        for guess in range(256):

            key = (block, pad, guess)

            if key not in average:
                continue

            if average[key] > best_time:
                best_time = average[key]
                best_guess = guess

        if best_guess is None:
            raise RuntimeError(
                f"Missing timing for block={block}, pad={pad}"
            )

        idx = BLOCK_SIZE - pad

        # Intermediate byte
        intermediate[idx] = best_guess ^ pad

        # Plaintext byte
        recovered[idx] = intermediate[idx] ^ previous[idx]

    plaintext.extend(recovered)


# --------------------------------------------------
# Remove PKCS#7 padding
# --------------------------------------------------

pad = plaintext[-1]

if 1 <= pad <= 16:
    plaintext = plaintext[:-pad]

print(plaintext.decode())
```
```
diag=neurotoxin;status=stable;subject=chell;memo=grodno{n3ur070x1n_d14gn0571c5_l34k_7hr0ugh_71m1ng_4l0n3};closing=still_alive
```