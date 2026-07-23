```
                   TheCakeIsALie.zip
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
   quantum.log                        reconcile.log
        │                                    │
        │                                    │
   Sifted Key Bob                     Replay CASCADE
        │                                    │
        └──────────────┬─────────────────────┘
                       │
               GF(2) Linear System
             (126 independent equations)
                       │
                       │
               pa_params.json
             matrix_rows_hex (112 rows)
                       │
                       ▼
      Evaluate every PA row using row space
                       │
             112-bit Privacy Key
                       │
        SHA256(PA || salt)
                       │
                Stream Generator
 SHA256(key || nonce || counter)
                       │
                XOR ciphertext
                       │
                       ▼
                    FLAG
```


### Deskripsi

Pada challenge ini diberikan sebuah arsip:

```
TheCakeIsALie.zip
├── quantum.log
├── reconcile.log
└── pa_params.json
```

Ketiga file tersebut merupakan hasil penyadapan sesi Quantum Key Distribution (BB84) yang menggunakan proses **CASCADE Reconciliation** dan **Privacy Amplification**.

Tujuan challenge adalah memperoleh secret key hasil Privacy Amplification kemudian menggunakannya untuk mendekripsi ciphertext sehingga memperoleh flag.

---

### Flow Penyelesaian

```
quantum.log
      │
      ▼
Bob Sifted Key (160 bit)
      │
      ▼
reconcile.log
      │
      ▼
Replay CASCADE
      │
      ▼
GF(2) Linear System
      │
      ▼
pa_params.json
      │
      ▼
Privacy Amplification
      │
      ▼
112-bit Secret
      │
      ▼
SHA256(secret || salt)
      │
      ▼
SHA256 Counter Stream
      │
      ▼
XOR Ciphertext
      │
      ▼
Flag
```

---

### Cell 1

Import library yang digunakan.

```python
import zipfile
import json
import random
import hashlib
import re

N_BITS = 160
```

Library yang digunakan:

- zipfile → membaca handout
- json → membaca parameter PA
- random → menghasilkan kembali permutation CASCADE
- hashlib → SHA256
- re → parsing log

---

### Cell 2

Membuka handout.

```python
zf = zipfile.ZipFile("TheCakeIsALie.zip")

print(zf.namelist())
```

Output

```
quantum.log
reconcile.log
pa_params.json
```

---

### Cell 3

Memuat seluruh isi file.

```python
quantum = zf.read("quantum.log").decode()
reconcile = zf.read("reconcile.log").decode()
pa = json.loads(zf.read("pa_params.json"))
```

---

### Cell 4

Mengambil seluruh bit Bob yang memiliki

```
kept = 1
```

Karena pada BB84 hanya bit yang memakai basis sama yang dipertahankan.

```python
bits=[]

for line in quantum.splitlines():

    ...

    if kept=="1":
        bits.append(int(result))
```

Output

```
160 bit
```

---

### Cell 5

Mengubah list bit menjadi integer.

```python
bob=0

for i,b in enumerate(bits):
    bob |= b<<i
```

Sekarang seluruh sifted key Bob tersimpan dalam satu integer 160-bit.

---

### Cell 6

Membuat fungsi parity.

```python
def parity(x):
    return x.bit_count() & 1
```

Parity digunakan hampir di seluruh proses CASCADE.

---

### Cell 7

Membuat fungsi mask.

```python
def make_mask(indices):

    m=0

    for i in indices:
        m |= 1<<i

    return m
```

Mask akan menunjukkan bit-bit mana yang sedang dihitung parity-nya.

---

### Cell 8

Membangun GF(2) Linear System.

```python
class LinearSystem:
```

Class ini menyimpan basis linear menggunakan Gaussian Elimination pada GF(2).

Setiap persamaan baru akan direduksi terhadap basis sebelumnya.

Tujuan akhirnya bukan mencari seluruh key Alice, tetapi hanya mengevaluasi Privacy Amplification.

---

### Cell 9

Membuat regex parser.

```python
ROUND_RE
Q_RE
FIX_RE
PROBE_RE
```

Regex digunakan untuk membaca seluruh transcript CASCADE.

Contoh log

```
ROUND 1 perm_seed=0xf6e1aeae065e07e6 block_size=20

Q block=0 interval=0:20 path=R syndrome=1

FIX block=0 perm_pos=0 path=RLLLL
```

---

### Cell 10

Replay seluruh transcript CASCADE.

Langkah yang dilakukan:

1. Membaca ROUND
2. Menghasilkan kembali permutation menggunakan

```python
random.Random(seed).shuffle(...)
```

3. Membuat mask untuk setiap query.
4. Menghitung

```
AliceParity

=

Syndrome XOR BobParity
```

5. Menambahkan persamaan tersebut ke GF(2).

Pada event FIX,

Bob diperbaiki dengan

```python
bob_live ^= 1<<original_position
```

Sehingga query selanjutnya menggunakan Bob yang sudah diperbaiki.

Setelah seluruh transcript selesai diproses diperoleh sekitar

```
Rank = 126
```

Artinya transcript CASCADE membocorkan 126 persamaan linear independen.

---

### Cell 11

Karena matrix PA disimpan dalam format MSB-first sedangkan integer Python menggunakan LSB-first, seluruh bit harus dibalik.

```python
reverse160()
```

---

### Cell 12

Menghitung seluruh output Privacy Amplification.

```python
rows=[...]

bits=[
    system.evaluate(r)
    for r in rows
]
```

Setiap row matrix PA merupakan dot product terhadap key Alice.

Namun karena seluruh row berada pada row-space hasil CASCADE, maka nilai tersebut dapat dihitung langsung tanpa mengetahui seluruh key Alice.

Output

```
112 bit
```

---

### Cell 13

Packing bit menjadi byte.

```python
pa_key=bytes(out)
```

Output

```
941b6581353ea5ca50fc6c84bfac
```

Inilah Privacy Amplification Secret.

---

### Cell 14

Membentuk encryption key.

```python
key = SHA256(
    pa_key + salt
)
```

Output berupa

```
32 byte key
```

---

### Cell 15

Challenge ternyata tidak menggunakan AES.

Keystream dibentuk menggunakan

```
SHA256(
    key ||
    nonce ||
    counter
)
```

Counter dimulai dari

```
0
```

Setiap hash menghasilkan 32 byte.

Semua hash digabung hingga panjangnya sama dengan ciphertext.

---

### Cell 16

Dekripsi dilakukan menggunakan XOR.

```python
plain = bytes(
    a ^ b
    for a,b in zip(cipher,stream)
)
```

Output

```
grodno{7h3_c4k3_15_4_l13_bu7_7h3_p4r17y_15_r34l}
```

---

### Vulnerability

CASCADE memang memperbaiki error komunikasi.

Namun setiap query CASCADE mengumumkan parity suatu subset bit.

Parity tersebut merupakan persamaan linear terhadap key Alice.

Normalnya Privacy Amplification harus menghilangkan seluruh informasi yang sudah bocor.

Pada challenge ini justru seluruh row pada Privacy Amplification Matrix berada di dalam row-space persamaan CASCADE.

Akibatnya secret hasil Privacy Amplification bukan lagi rahasia.

Attacker dapat langsung menghitung seluruh output PA hanya menggunakan transcript publik.

---

### Kesimpulan

Urutan eksploitasi:

1. Parse quantum.log.
2. Bangun Bob sifted key.
3. Replay seluruh reconcile.log.
4. Bentuk sistem linear GF(2).
5. Evaluasi matrix Privacy Amplification.
6. Peroleh 112-bit secret.
7. Bangun SHA256(secret || salt).
8. Bangun SHA256 Counter Stream.
9. XOR dengan ciphertext.
10. Peroleh flag.

---

#### Flag

```
grodno{7h3_c4k3_15_4_l13_bu7_7h3_p4r17y_15_r34l}
```