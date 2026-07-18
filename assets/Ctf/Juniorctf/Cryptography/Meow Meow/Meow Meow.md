#### Flow Penyelesaian Challenge

```
                    meow_rsa.meow
                          │
                          ▼
            Reverse Engineering Format File
                          │
                          ▼
                Decode menjadi Pseudocode
                          │
                          ▼
             Analisis Generator SplitMix64
                          │
                          ▼
             Rekonstruksi Key Generator RSA
                          │
                          ▼
             Generate p_base dan q_base
                          │
                          ▼
          Filter Timestamp menggunakan Modulus
                          │
                          ▼
                Menemukan Unix Timestamp
                          │
                          ▼
          next_prime(p_base) dan next_prime(q_base)
                          │
                          ▼
                 Recover Faktor RSA (p,q)
                          │
                          ▼
                  Hitung Private Exponent
                          │
                          ▼
                    Dekripsi Ciphertext
                          │
                          ▼
                           FLAG
```

---

### Deskripsi

Challenge ini menyembunyikan pseudocode pembangkit kunci RSA di dalam file `meow_rsa.meow`. Kunci RSA dibangkitkan secara deterministik menggunakan **SplitMix64** dengan seed berupa **Unix timestamp** pada rentang satu minggu. Tujuan akhirnya adalah merekonstruksi generator, menemukan seed yang benar, memfaktorkan modulus RSA, dan mendekripsi ciphertext.

#### 1.1 Mengamati isi file

File hanya berisi kata **Meow** yang berulang.

Tujuan tahap ini adalah mencari pola penyimpanan data.
```
from pathlib import Path

text = Path("meow_rsa.meow").read_text()

print(text[:500])
```

output :
```
Meow Meow;
Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow Meow
```

#### 1.2 Menghitung jumlah kata "Meow"

Setiap baris dihitung menggunakan:

```
from pathlib import Path

text = Path("meow_rsa.meow").read_text()

for i, line in enumerate(text.splitlines()[:20]):
    print(i, line.count("Meow"))
```
output :
```
0 2
1 115
2 10
3 2
4 101
5 10
6 2
7 101
8 10
9 2
10 100
11 10
12 2
13 32
14 10
15 2
16 61
17 10
18 2
19 32
```
langsung kita rapihkan :
```
from pathlib import Path

text = Path("meow_rsa.meow").read_text()

counts = []

for line in text.splitlines():
    counts.append(line.count("Meow"))

print(counts[:50])
```
output :
```
[2, 115, 10, 2, 101, 10, 2, 101, 10, 2, 100, 10, 2, 32, 10, 2, 61, 10, 2, 32, 10, 2, 117, 10, 2, 110, 10, 2, 105, 10, 2, 120, 10, 2, 95, 10, 2, 116, 10, 2, 105, 10, 2, 109, 10, 2, 101, 10, 2, 40]
```

#### 1.3 Analisis ASCII
```
Nilai:

115 → s
101 → e
101 → e
100 → d
```
sehingga mulai terbaca kata seed.

#### 1.4 Decoder

```
from pathlib import Path

lines = Path("meow_rsa.meow").read_text().splitlines()

values = []

for line in lines:

    if line == ";":
        values.append(0)
    else:
        values.append(line.count("Meow"))

decoded = []

i = 0

while i + 2 < len(values):

    marker = values[i]

    ascii_code = values[i + 1]

    newline = values[i + 2]

    assert marker == 2
    assert newline == 10

    decoded.append(chr(ascii_code))

    i += 3

print("".join(decoded))
```
output :
```
seed = unix_time(2026-06-20 00:00:00 UTC .. 2026-06-26 23:59:59 UTC)
splitmix64(x):
  x = (x + 0x9E3779B97F4A7C15) mod 2^64
  z = x
  z = ((z xor (z >> 30)) * 0xBF58476D1CE4E5B9) mod 2^64
  z = ((z xor (z >> 27)) * 0x94D049BB133111EB) mod 2^64
  z = z xor (z >> 31)
state = seed xor 0x6A09E667F3BCC909
skip = 0x80 + ((seed >> 12) & 0xff) + (seed & 0x1f)
advance state skip times
p_words[i] = splitmix64(state) xor rol64(seed, i + 3)
q_words[i] = bswap64(splitmix64(state) xor 0xA5A5A5A5A5A5A5A5 xor p_words[i]) xor rol64(seed, 11 + i)
p = next_prime(pack6(p_words) | (1 << 383) | 1)
q = next_prime(pack6(q_words) | (1 << 383) | 1)
read ciphertext.txt
```


Format setiap karakter adalah:

```
2 -> marker
ASCII -> karakter
10 -> newline
```
Setelah seluruh file didecode diperoleh pseudocode generator RSA.

### Memahami SplitMix64
#### 2.1 Konstanta

Generator menggunakan:
```
GAMMA
MIX1
MIX2
MASK64
```

```
MASK64 = (1 << 64) - 1

GAMMA = 0x9E3779B97F4A7C15

MIX1 = 0xBF58476D1CE4E5B9

MIX2 = 0x94D049BB133111EB
```

#### 2.2 Fungsi Mixing
State bertambah dengan `GAMMA`, kemudian diproses fungsi mixing untuk menghasilkan bilangan acak 64-bit.
Implementasi:
```
def splitmix64_from_state(state):

    z = state & MASK64

    z = ((z ^ (z >> 30)) * MIX1) & MASK64

    z = ((z ^ (z >> 27)) * MIX2) & MASK64

    z ^= (z >> 31)

    return z & MASK64
```
#### 2.3 Konsep

State selalu bertambah:
```
state += GAMMA
```
Sedangkan nilai acak berasal dari proses mixing
```
state = 0

for i in range(5):

    state = (state + GAMMA) & MASK64

    rnd = splitmix64_from_state(state)

    print(f"Step {i}")
    print("State :", hex(state))
    print("Random:", hex(rnd))
    print()
```
output :
```
Step 0
State : 0x9e3779b97f4a7c15
Random: 0xe220a8397b1dcdaf

Step 1
State : 0x3c6ef372fe94f82a
Random: 0x6e789e6aa1b965f4

Step 2
State : 0xdaa66d2c7ddf743f
Random: 0x6c45d188009454f

Step 3
State : 0x78dde6e5fd29f054
Random: 0xf88bb8a8724c81ec

Step 4
State : 0x1715609f7c746c69
Random: 0x1b39896a51a8749b
```
simpel :
```
state = 0

state = (state + GAMMA) & MASK64

print("state")
print(hex(state))

rnd = splitmix64_from_state(state)

print()

print("random")
print(hex(rnd))
```
output:
```
state
0x9e3779b97f4a7c15

random
0xe220a8397b1dcdaf
```

### Seed → State

#### 3.1 State awal

`state = seed XOR STATE_XOR`
```
MASK64 = (1 << 64) - 1

STATE_XOR = 0x6A09E667F3BCC909

seed = 1782240431

state = seed ^ STATE_XOR

print("Seed")
print(seed)
print(hex(seed))

print()

print("Initial State")
print(hex(state))
```
output:
```
state
0x9e3779b97f4a7c15

random
0xe220a8397b1dcdaf
```

```
a = 0b1101
b = 0b0110

print(bin(a ^ b))
```
output:
```
0b1011
```
#### 3.2 Menghitung skip
```
skip =
0x80
+
((seed>>12)&0xff)
+
(seed&0x1f)
```
cara kodingnya seperti ini :
```
skip = (
    0x80
    + ((seed >> 12) & 0xff)
    + (seed & 0x1f)
)

print(skip)
```

Untuk seed benar:

```
skip = 316
```

#### 3.3 Advance State

Karena SplitMix64 hanya mengubah state dengan penambahan konstan:

`state += skip * GAMMA`

Tidak perlu melakukan loop sebanyak skip kali.
```
GAMMA = 0x9E3779B97F4A7C15

state = (
    state
    + skip * GAMMA
) & MASK64

print(hex(state))
```
output :
```
0xb6842760b9774792
```

### Membangun p_words
#### 4.1 Rotasi seed

`rol64(seed,i+3)`
```
def rol64(x, r):
    r &= 63
    x &= MASK64
    return (((x << r) & MASK64) | (x >> (64-r))) if r else x
```
```
print(hex(rol64(1,1)))
print(hex(rol64(1,63)))
```
output:
```
0x2
0x8000000000000000
```
#### 4.2 Generate word
```
state += GAMMA
↓

SplitMix

↓

Random64

↓

XOR rol64(seed)

↓

p_word
```

```
seed = 1782240431

skip = (
    0x80
    + ((seed>>12)&0xff)
    + (seed&0x1f)
)

state = (
    (seed ^ STATE_XOR)
    + skip*GAMMA
) & MASK64
```
```
p_words = []

for i in range(6):

    state = (state + GAMMA) & MASK64

    rnd = splitmix64_from_state(state)

    word = rnd ^ rol64(seed, i+3)

    p_words.append(word)

    print("="*40)
    print("i =",i)
    print("state :",hex(state))
    print("random:",hex(rnd))
    print("rol64 :",hex(rol64(seed,i+3)))
    print("pword :",hex(word))
```
output :
```
========================================
i = 0
state : 0x54bba11a38c1c3a7
random: 0xab539cd5f3054fa5
rol64 : 0x351d6a578
pword : 0xab539cd6a2d3eadd
========================================
i = 1
state : 0xf2f31ad3b80c3fbc
random: 0x954a25d9635269d8
rol64 : 0x6a3ad4af0
pword : 0x954a25dfc0ff2328
========================================
i = 2
state : 0x912a948d3756bbd1
random: 0xf2879a66fa28fdde
rol64 : 0xd475a95e0
pword : 0xf2879a6bbd72683e
========================================
i = 3
state : 0x2f620e46b6a137e6
random: 0x247e6eab0d3bf3b8
rol64 : 0x1a8eb52bc0
pword : 0x247e6eb1838ed878
========================================
i = 4
state : 0xcd99880035ebb3fb
random: 0x72555931a14122cd
rol64 : 0x351d6a5780
pword : 0x72555904bc2b754d
========================================
i = 5
state : 0x6bd101b9b5363010
random: 0x1f157ac1fe0cae75
rol64 : 0x6a3ad4af00
pword : 0x1f157aabc4d80175
```

Hasilnya diperoleh lima buah word 64-bit.


### Membangun q_words

Generator melanjutkan state yang sama.

Untuk setiap word:
```
Random64
↓

XOR 0xA5A5...
↓

XOR p_word
↓

bswap64()
↓

XOR rol64(seed)
↓

q_word
```
```
CAT_MASK = 0xA5A5A5A5A5A5A5A5
```
```
x = 0x1122334455667788

print(hex(x))

print(hex(x ^ CAT_MASK))
```
output :
```
0x1122334455667788
0xb48796e1f0c3d22d
```
```
mixed = rnd ^ CAT_MASK ^ p_words[0]

print(hex(rnd))
print(hex(CAT_MASK))
print(hex(p_words[0]))
print(hex(mixed))
```
output :
```
0xab539cd5f3054fa5
0xa5a5a5a5a5a5a5a5
0xab539cd6a2d3eadd
0xa5a5a5a6f47300dd
```
```
state = (state + GAMMA) & MASK64

rnd = splitmix64_from_state(state)

print("Random")
print(hex(rnd))

mixed = rnd ^ CAT_MASK

print()
print("After CAT_MASK")
print(hex(mixed))

mixed ^= p_words[0]

print()
print("After XOR P0")
print(hex(mixed))

swapped = bswap64(mixed)

print()
print("After BSWAP")
print(hex(swapped))

q0 = swapped ^ rol64(seed,11)

print()
print("Q0")
print(hex(q0))
```
output :
```
Random
0x954a25d9635269d8

After CAT_MASK
0x30ef807cc6f7cc7d

After XOR P0
0x9bbc1caa642426a0

After BSWAP
0xa0262464aa1cbc9b

Q0
0xa02627357cb9c49b
```
```
p_base = pack6_big(p_words)

q_base = pack6_big(q_words)

print(hex(p_base))

print()

print(hex(q_base))
```
output :
```
0xab539cd6a2d3eadd954a25dfc0ff2328f2879a6bbd72683e247e6eb1838ed87872555904bc2b754d1f157aabc4d80175

0x9998dae6915ae096827ad506914f1b6e4c67935613efa963ab7ab75a017eba7846cbf7dd7472752cb25261874478adc8
```

Sehingga dihasilkan lima buah q_words.

### pack6()

Enam buah word digabung menjadi integer 384-bit.
```
word0 || word1 || word2 || word3 || word4 || word5
```
Kemudian:
```
| (1<<383)
| 1
```
agar kandidat:

- tepat 384 bit
- selalu ganjil

Hasilnya adalah:
- p_base
- q_base

```
p_base |= (1<<383)
```
```
p_base |= 1
```
```
THRESHOLD = 1 << 430
```
```
start, end, n, e, c = parse_ciphertext(Path("ciphertext.txt"))
```
```
print(type(n))
print(n)
```
output :
```
<class 'int'>
774181844113804374930418565834355884365584696257795610529339279473823850029106129000224661895005632819563027838895414719398562548235723597217496044005475808668940499096418517223390382874874819673166433622269362807020785662051422221
```
```
seed = 1782240431

p_base, q_base = prime_bases(seed)

print("p bits :", p_base.bit_length())
print("q bits :", q_base.bit_length())

diff = abs(n - p_base * q_base)

print("diff =", diff)
print("diff bits =", diff.bit_length())
```
output :
```
p bits : 384
q bits : 384
diff = 6402579929618498797351195114314531151605860412031932738578687682394327798259738135873127884263806355992410849386859324
diff bits = 392
```

### Menemukan Timestamp
#### 7.1 Ide

Tidak langsung memanggil `next_prime()`.

Hitung:
```
diff = |n - p_base*q_base|
7.2 Threshold
```
Gunakan:
```
2^430
```
Seed yang benar menghasilkan:
```
diff.bit_length() = 392
```
Sedangkan seed acak sekitar:
```
763 bit
```
```
seed = 1782240432

p_base, q_base = prime_bases(seed)

diff = abs(n - p_base * q_base)

print(diff.bit_length())
```
output :
```
763
```


#### 7.3 Brute Force

Scan seluruh timestamp:
```
2026-06-20
...
2026-06-26
```
Hasil:
```
FOUND 1782240431
```
```
THRESHOLD = 1 << 430

for seed in range(start, end + 1):

    p_base, q_base = prime_bases(seed)

    diff = abs(n - p_base * q_base)

    if diff < THRESHOLD:
        print("FOUND", seed)
        break
```
output :
```
FOUND 1782240431
```

### Recover Prime

Dengan seed yang benar:
```
p = next_prime(p_base)
q = next_prime(q_base)
```
Write-up resmi:
```
Δp = 60
Δq = 176
```
Verifikasi:
```
assert p*q == n
```
```
seed = 1782240431

p_base, q_base = prime_bases(seed)

p = next_prime(p_base)
q = next_prime(q_base)

print("Δp =", p - p_base)
print("Δq =", q - q_base)

print()

print("p bits =", p.bit_length())
print("q bits =", q.bit_length())
```
output :
```
Δp = 60
Δq = 176

p bits = 384
q bits = 384

```
```
print(p * q == n)
```
output :
`True`
### Dekripsi RSA

Hitung:
```
phi = (p-1)*(q-1)

d = pow(e,-1,phi)

m = pow(c,d,n)
```
Konversi integer menjadi bytes:
```
plaintext = m.to_bytes(
    (m.bit_length()+7)//8,
    "big"
)
``
Flag yang diperoleh:
```
grodno{meowMeoWmEOwmeeoowMEOWWW}
```
```
phi = (p - 1) * (q - 1)

d = pow(e, -1, phi)

m = pow(c, d, n)

plaintext = m.to_bytes(
    (m.bit_length() + 7) // 8,
    "big"
)

print(plaintext)
print(plaintext.decode())
```
output :
```
b'grodno{meowMeoWmEOwmeeoowMEOWWW}'
grodno{meowMeoWmEOwmeeoowMEOWWW}
```