### Flow
```
                     public.zip
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   capture.log                        pubkey.txt
        │                                   │
        │                                   ▼
        │                          Parse Public Key
        │                                   │
        ▼                                   ▼
Recover 30 Signatures             Recover Point Q
        │                                   │
        └───────────────┬───────────────────┘
                        │
                        ▼
             Curve Reconstruction
                        │
                        ▼
             Recover curve parameter b
                        │
                        ▼
              Recover Generator G
                        │
                        ▼
             Recover Curve Order (#E)
                        │
                        ▼
                 Factor Curve Order
                        │
                        ▼
             Find Small Prime Factor f
                        │
                        ▼
          Build Small Subgroup Generator
                        │
                        ▼
               Baby-Step Giant-Step
                        │
                        ▼
            Recover nonce residue
                  k mod f
                        │
                        ▼
             Hidden Number Problem
                        │
                        ▼
             Linear Equation System
                        │
                        ▼
                Build Lattice Basis
                        │
                        ▼
                 LLL Reduction
                        │
                        ▼
               Gram-Schmidt Basis
                        │
                        ▼
              Babai Nearest Plane
                        │
                        ▼
             Candidate Private Key
                        │
                        ▼
         Verify against 30 signatures
                        │
                        ▼
               Recover Private Key
                        │
                        ▼
         SHA256(private_key)[:16]
                        │
                        ▼
                 AES-GCM Decrypt
                        │
                        ▼
                      FLAG
```

### Ucucuga — Cryptography (Nightmare)

### Informasi challenge

- **Event:** Junior.Crypt 2026 (GRODNO::CTF)
- **Kategori:** Cryptography
- **Tingkat:** Nightmare
- **Format flag:** `grodno{...}`

Target challenge adalah memulihkan private key dari signing service yang crash, lalu memakai private key tersebut untuk membuka vault AES-GCM. Berkas `public.zip` berisi `capture.log`, `pubkey.txt`, `vault.json`, dan `crash_strings.txt`.

### Hasil akhir

```text
private_key = df416f62d1208db259780a3e870a7aa417bd9ca6b2546f91ca09ea044b863b31
flag = grodno{suh@r1k1_3_k0r0chk1}
```

#### 1. Recon dan identifikasi jebakan

Pada awalnya semua file terlihat seperti implementasi ECDSA normal di atas `secp256k1`:

- `pubkey.txt` berisi public key tidak terkompresi: prefiks `04`, lalu koordinat `x` dan `y` masing-masing 32 byte.
- `capture.log` berisi 30 message dan signature `r || s`.
- `vault.json` berisi `nonce`, `ciphertext`, dan `tag` AES-GCM.
- `crash_strings.txt` menyebut `secp256k1`, `ECDSA_sign_digest`, `sha256`, serta `bucket_a/b/c`.

Field `bucket_a`, `bucket_b`, dan `bucket_c` merupakan red herring. Jangan langsung menganggap field itu potongan nonce atau material KDF. Titik awal yang benar adalah memeriksa apakah public key benar-benar berada pada kurva secp256k1.

Rumus kurva secp256k1 adalah:

```text
y² = x³ + 7 (mod p)
```

Jika public key valid, nilai `y² - x³ (mod p)` harus sama dengan `7`. Pada challenge ini nilainya berbeda, tetapi tetap konsisten pada kurva lain dengan field prime yang sama.

#### 2. Memuat handout dan konstanta

```python
import base64
import hashlib
import itertools
import json
import math
import zipfile
from fractions import Fraction
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sympy import Matrix

HANDOUT = Path("handout/public.zip")

with zipfile.ZipFile(HANDOUT) as zf:
    ROWS = [
        json.loads(line)
        for line in zf.read("public/capture.log").decode().splitlines()
    ]
    PUB = bytes.fromhex(zf.read("public/pubkey.txt").decode().strip())
    VAULT = json.loads(zf.read("public/vault.json"))

P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
SMALL_FACTOR = 20_412_485_227
```

Fungsi setiap bagian:

- `ZipFile(...)` membuka handout secara offline.
- `ROWS` mengubah setiap baris JSON capture menjadi dictionary Python.
- `PUB` memuat public key hex menjadi bytes.
- `P` adalah prime field secp256k1, `N` adalah order standar secp256k1, dan `GX/GY` adalah generator standar.
- `SMALL_FACTOR` adalah faktor kecil order kurva faulted yang akan membuat discrete log menjadi mungkin.

#### 3. Aritmetika titik pada kurva custom

Kurva faulted tetap berbentuk short-Weierstrass dengan `a = 0`:

```text
y² = x³ + b (mod p)
```

Karena `b` berubah, operasi titik harus dilakukan pada kurva custom, bukan lewat library secp256k1 biasa.

```python
Point = tuple[int, int] | None

def point_add(left: Point, right: Point) -> Point:
    """Menjumlahkan dua titik affine pada y² = x³ + b modulo P."""
    if left is None:
        return right
    if right is None:
        return left

    x1, y1 = left
    x2, y2 = right
    if x1 == x2 and (y1 + y2) % P == 0:
        return None                         # P + (-P) = titik tak hingga

    if left == right:
        if y1 == 0:
            return None
        slope = (3 * x1 * x1) * pow(2 * y1, -1, P) % P
    else:
        slope = (y2 - y1) * pow((x2 - x1) % P, -1, P) % P

    x3 = (slope * slope - x1 - x2) % P
    y3 = (slope * (x1 - x3) - y1) % P
    return x3, y3

def point_neg(point: Point) -> Point:
    """Menghasilkan lawan titik: (x, y) -> (x, -y mod P)."""
    return None if point is None else (point[0], (-point[1]) % P)

def point_mul(scalar: int, point: Point) -> Point:
    """Double-and-add untuk menghitung scalar * point."""
    result: Point = None
    addend = point
    while scalar:
        if scalar & 1:
            result = point_add(result, addend)
        addend = point_add(addend, addend)
        scalar >>= 1
    return result
```

Penjelasan fungsi:

- `point_add()` menangani identitas, invers titik, penjumlahan dua titik berbeda, dan doubling satu titik.
- `pow(denominator, -1, P)` menghitung invers modular.
- `point_neg()` dibutuhkan untuk giant step BSGS.
- `point_mul()` memakai double-and-add sehingga perkalian scalar membutuhkan sekitar jumlah bit scalar, bukan penjumlahan berulang.

#### 4. Rekonstruksi parameter kurva `b`

```python
def sqrt_mod(value: int) -> int:
    """Akar kuadrat modular karena P ≡ 3 mod 4."""
    root = pow(value % P, (P + 1) // 4, P)
    if root * root % P != value % P:
        raise ValueError("not a square")
    return root

Q = (
    int.from_bytes(PUB[1:33], "big"),
    int.from_bytes(PUB[33:], "big"),
)
CURVE_B = (Q[1] * Q[1] - pow(Q[0], 3, P)) % P

assert CURVE_B != 7
assert (Q[1] * Q[1] - pow(Q[0], 3, P) - CURVE_B) % P == 0
print(hex(CURVE_B))
```

Output parameter kurva:

```text
0x2c05cf6bee75353e84eb472a5b851b8c872b04c466a9a6ff54a67c3e92ab33d4
```

`sqrt_mod()` memakai fakta `P mod 4 = 3`, sehingga akar kuadrat modular dapat dihitung dengan eksponen `(P + 1) // 4`. `CURVE_B` diperoleh langsung dengan memindahkan suku pada persamaan kurva: `b = y² - x³ mod p`.

Inilah vulnerability utama: signer memakai sibling curve faulted, bukan secp256k1 asli. Group order sibling curve memiliki faktor kecil yang tidak seharusnya ada pada grup ECDSA kuat.

#### 5. Memulihkan generator dan order kurva

Generator custom mempertahankan `G.x` secp256k1, tetapi `G.y` berubah karena parameter `b` berubah.

```python
gy_root = sqrt_mod(pow(GX, 3, P) + CURVE_B)
CUSTOM_G = (
    GX,
    min((gy_root, (-gy_root) % P), key=lambda y: abs(y - GY)),
)

assert CUSTOM_G[1] == GY - 22_036
```

Ada dua akar kuadrat: `y` dan `-y mod p`. Kode memilih akar yang paling dekat dengan `GY` generator standar. Hasilnya adalah `GY - 22036`.

Kurva `j = 0` memiliki enam kemungkinan twist. Order tidak perlu dicari secara brute force; gunakan representasi complex multiplication `4p = t² + 27m²` untuk membuat enam trace kandidat, lalu pilih order yang membuat `order * Q = O`.

```python
standard_trace = P + 1 - N
cm_m_sq = (4 * P - standard_trace * standard_trace) // 27
cm_m = math.isqrt(cm_m_sq)
assert cm_m * cm_m == cm_m_sq

traces = {
    standard_trace, -standard_trace,
    (standard_trace + 9 * cm_m) // 2,
    (standard_trace - 9 * cm_m) // 2,
    (-standard_trace + 9 * cm_m) // 2,
    (-standard_trace - 9 * cm_m) // 2,
}
curve_orders = [P + 1 - trace for trace in traces]
annihilating = [order for order in curve_orders if point_mul(order, Q) is None]

assert len(annihilating) == 1
CURVE_ORDER = annihilating[0]
GROUP_ORDER = CURVE_ORDER // 2
assert point_mul(GROUP_ORDER, CUSTOM_G) is None
assert GROUP_ORDER % SMALL_FACTOR == 0
```

Fungsi blok ini:

- `isqrt()` mencari `m` secara integer tanpa floating point.
- `traces` membangun enam kandidat trace untuk sextic twists dari kurva `j=0`.
- `point_mul(order, Q) is None` menguji apakah kandidat order menganulir public key.
- `GROUP_ORDER // SMALL_FACTOR` nanti menjadi cofactor untuk memproyeksikan titik ke subgroup kecil.

#### 6. Mengambil `r`, `s`, dan lift titik nonce

Dalam ECDSA, nilai `r` berasal dari koordinat-x titik nonce `kG`. Karena itu `r` bisa di-lift kembali sebagai titik pada kurva faulted.

```python
def signature_parts(row: dict[str, object]) -> tuple[int, int]:
    """Memisahkan signature 64 byte menjadi integer r dan s."""
    raw = bytes.fromhex(str(row["sig"]))
    return int.from_bytes(raw[:32], "big"), int.from_bytes(raw[32:], "big")

def lift_r(row: dict[str, object]) -> tuple[int, int]:
    """Membuat kandidat titik nonce dari koordinat-x r."""
    r, _ = signature_parts(row)
    y = sqrt_mod(pow(r, 3, P) + CURVE_B)
    return r, y
```

Terdapat dua kandidat nonce point: `(r, y)` dan `(r, -y)`. Ambiguitas tanda ini ditangani kemudian dengan mencoba `2^8` kombinasi untuk delapan signature.

#### 7. Baby-step Giant-step untuk mendapatkan `k mod f`

Faktor kecilnya adalah:

```text
f = 20412485227
log2(f) ≈ 34.9 bit
```

Subgroup berorde 35 bit masih dapat dihitung dengan BSGS. Kompleksitasnya sekitar `sqrt(f)`, bukan `f`.

```python
class SmallSubgroupDLog:
    """Discrete log BSGS di subgroup berorde SMALL_FACTOR."""
    def __init__(self) -> None:
        self.cofactor = GROUP_ORDER // SMALL_FACTOR
        self.base = point_mul(self.cofactor, CUSTOM_G)
        assert self.base is not None

        self.width = math.isqrt(SMALL_FACTOR) + 1
        self.table: dict[Point, int] = {}
        current: Point = None
        for j in range(self.width):
            self.table.setdefault(current, j)
            current = point_add(current, self.base)

        self.giant_step = point_neg(point_mul(self.width, self.base))

    def solve(self, point: Point) -> int:
        """Mengembalikan discrete log point modulo SMALL_FACTOR."""
        target = point_mul(self.cofactor, point)
        for i in range(self.width + 1):
            j = self.table.get(target)
            if j is not None:
                answer = (i * self.width + j) % SMALL_FACTOR
                if point_mul(answer, self.base) == point_mul(self.cofactor, point):
                    return answer
            target = point_add(target, self.giant_step)
        raise RuntimeError("small-subgroup discrete log failed")

dlog = SmallSubgroupDLog()
indices = tuple(range(8))
nonce_residues = [dlog.solve(lift_r(ROWS[i])) for i in indices]
```

Penjelasan:

- `cofactor` memproyeksikan `CUSTOM_G` dan nonce point ke subgroup dengan order `f`.
- Constructor membuat baby table `j * base` untuk `j` dari `0` sampai `sqrt(f)`.
- `giant_step` adalah `-width * base`; setiap iterasi mengurangi target sebesar satu giant step.
- Saat target ditemukan di baby table, jawaban adalah `i * width + j`.
- Delapan residue dipakai karena `8 × 34.9 > 256` bit; secara informasi cukup untuk memulihkan private scalar 256-bit melalui HNP.

#### 8. Mengubah leakage nonce menjadi Hidden Number Problem

Persamaan ECDSA:

```text
s·k ≡ z + r·d (mod n)
```

Dengan nonce leakage `k = c + f·t`, di mana `c = k mod f` diketahui dari BSGS, maka setelah substitusi dan perkalian `f⁻¹` didapat persamaan linear terhadap private key `d`:

```text
A·d + C ≡ t (mod n)
```

Nilai `t` jauh lebih kecil daripada `n` karena dibatasi sekitar `n/f`. Batas kecil ini adalah alasan lattice dapat menemukan `d`.

```python
def message_digest(row: dict[str, object]) -> int:
    """Decode blob Base64 lalu hitung SHA-256 sebagai integer z ECDSA."""
    message = base64.b64decode(str(row["blob"]))
    return int.from_bytes(hashlib.sha256(message).digest(), "big")

inv_f = pow(SMALL_FACTOR, -1, N)
linear_coefficients: list[int] = []
constant_terms: list[int] = []

for index in indices:
    r, s = signature_parts(ROWS[index])
    s_inv = pow(s, -1, N)
    linear_coefficients.append((r * s_inv % N) * inv_f % N)
    constant_terms.append((message_digest(ROWS[index]) * s_inv % N) * inv_f % N)

quotient_bound = (N + SMALL_FACTOR - 1) // SMALL_FACTOR
error_bound = (quotient_bound + 1) // 2
```

Fungsi setiap variabel:

- `message_digest()` menghasilkan `z`, hash message pada persamaan ECDSA.
- `s_inv` adalah invers modular `s`.
- `linear_coefficients` menyimpan koefisien `A` untuk secret `d`.
- `constant_terms` menyimpan komponen `C`.
- `error_bound` membatasi error lattice berdasarkan ukuran quotient nonce.

#### 9. LLL dan Babai nearest-plane

Bagian berikut membangun basis lattice, mereduksinya dengan LLL, lalu memakai Babai nearest-plane untuk mencari kandidat private key.

```python
def nearest_integer(value: Fraction) -> int:
    """Pembulatan Fraction yang simetris untuk Gram-Schmidt exact."""
    if value >= 0:
        return (2 * value.numerator + value.denominator) // (2 * value.denominator)
    return -nearest_integer(-value)

class HNPSolver:
    def __init__(self, coefficients: list[int], modulus: int, error_bound: int):
        self.modulus = modulus
        self.error_bound = error_bound
        dimension = len(coefficients)
        modulus_sq = modulus * modulus

        basis: list[list[int]] = []
        for i in range(dimension):
            row = [0] * (dimension + 1)
            row[i] = modulus_sq
            basis.append(row)
        basis.append(
            [(coefficient % modulus) * modulus for coefficient in coefficients]
            + [error_bound]
        )

        reduced = Matrix(basis).lll(delta=Fraction(99, 100))
        self.rows = [[int(value) for value in reduced.row(i)] for i in range(dimension + 1)]

        self.stars: list[list[Fraction]] = []
        for i, row in enumerate(self.rows):
            vector = [Fraction(value) for value in row]
            for j in range(i):
                denominator = sum(value * value for value in self.stars[j])
                mu = sum(Fraction(row[k]) * self.stars[j][k] for k in range(dimension + 1)) / denominator
                vector = [vector[k] - mu * self.stars[j][k] for k in range(dimension + 1)]
            self.stars.append(vector)

    def solve(self, targets: list[int]) -> set[int]:
        """Babai nearest-plane dan neighbor kecil untuk kandidat d."""
        dimension = len(targets)
        target = [(value % self.modulus) * self.modulus for value in targets] + [0]
        remainder = [Fraction(value) for value in target]
        coefficients = [0] * (dimension + 1)

        for i in range(dimension, -1, -1):
            denominator = sum(value * value for value in self.stars[i])
            projection = sum(remainder[k] * self.stars[i][k] for k in range(dimension + 1)) / denominator
            coefficient = nearest_integer(projection)
            coefficients[i] = coefficient
            remainder = [remainder[k] - coefficient * self.rows[i][k] for k in range(dimension + 1)]

        candidates: set[int] = set()
        for index, offset in [(None, 0)] + [(j, d) for j in range(dimension + 1) for d in (-2, -1, 1, 2)]:
            trial = coefficients.copy()
            if index is not None:
                trial[index] += offset
            last = sum(trial[i] * self.rows[i][-1] for i in range(dimension + 1))
            if last % self.error_bound == 0:
                candidates.add((last // self.error_bound) % self.modulus)
        return candidates
```

Penjelasan fungsi:

- `nearest_integer()` membulatkan nilai `Fraction` tanpa error floating point.
- `HNPSolver.__init__()` membuat basis HNP, menjalankan `LLL`, dan menghitung basis Gram-Schmidt satu kali.
- `HNPSolver.solve()` membuat target dari satu kombinasi residue nonce, menjalankan Babai dari vektor terakhir ke pertama, lalu menguji tetangga kecil hasil pembulatan.
- `sympy.Matrix.lll()` adalah implementasi lattice reduction; `Fraction` dipakai supaya proyeksi Babai tetap exact.

#### 10. Menangani ambiguitas tanda dan memverifikasi private key

Setiap nilai `r` memiliki dua lift point, sehingga residue nonce dapat bernilai `c` atau `-c mod f`. Untuk delapan signature ada `2⁸ = 256` kombinasi; jumlah ini kecil.

```python
solver = HNPSolver(linear_coefficients, N, error_bound)

def nonce_residues_match(private_key: int) -> bool:
    """Filter murah: cek apakah d cocok dengan delapan residue BSGS."""
    for j, index in enumerate(indices):
        r, s = signature_parts(ROWS[index])
        nonce = (message_digest(ROWS[index]) + r * private_key) * pow(s, -1, N) % N
        residue = nonce % SMALL_FACTOR
        known = nonce_residues[j]
        if residue not in (known, (-known) % SMALL_FACTOR):
            return False
    return True

def verifies_everything(private_key: int) -> bool:
    """Verifikasi Q = dG dan seluruh 30 nilai r pada kurva custom."""
    if point_mul(private_key, CUSTOM_G) != Q:
        return False
    for row in ROWS:
        r, s = signature_parts(row)
        nonce = (message_digest(row) + r * private_key) * pow(s, -1, N) % N
        nonce_point = point_mul(nonce, CUSTOM_G)
        if nonce_point is None or nonce_point[0] != r:
            return False
    return True

private_key = None
for signs in itertools.product((1, -1), repeat=len(indices)):
    targets = []
    for j, sign in enumerate(signs):
        residue = nonce_residues[j] if sign == 1 else (-nonce_residues[j]) % SMALL_FACTOR
        centered_constant = (constant_terms[j] - residue * inv_f) % N
        targets.append((-centered_constant + quotient_bound // 2) % N)

    for candidate in solver.solve(targets):
        if nonce_residues_match(candidate) and verifies_everything(candidate):
            private_key = candidate
            break
    if private_key is not None:
        break

assert private_key is not None
print(f"private_key = {private_key:064x}")
```

`nonce_residues_match()` adalah filter cepat supaya kandidat salah tidak perlu diverifikasi terhadap seluruh capture. `verifies_everything()` adalah bukti akhir: kandidat harus membentuk public key `Q` yang benar dan menghasilkan koordinat-x `r` untuk semua 30 signature.

Private key yang dipulihkan:

```text
df416f62d1208db259780a3e870a7aa417bd9ca6b2546f91ca09ea044b863b31
```

#### 11. Mendekripsi vault AES-128-GCM

Kunci vault berasal dari 16 byte pertama SHA-256 private key dalam format 32 byte big-endian.

```python
private_bytes = private_key.to_bytes(32, "big")
vault_key = hashlib.sha256(private_bytes).digest()[:16]

vault_nonce = bytes.fromhex(VAULT["nonce"])
vault_data = bytes.fromhex(VAULT["ciphertext"]) + bytes.fromhex(VAULT["tag"])
plaintext = AESGCM(vault_key).decrypt(vault_nonce, vault_data, b"")

assert plaintext.startswith(b"grodno{") and plaintext.endswith(b"}")
print(plaintext.decode())
```

Penjelasan:

- `to_bytes(32, "big")` menjaga representasi scalar yang tepat untuk KDF.
- `SHA256(...).digest()[:16]` menghasilkan kunci AES-128.
- AES-GCM menerima gabungan `ciphertext || tag`.
- Argumen terakhir `b""` berarti tidak ada Additional Authenticated Data.
- Bila key salah atau ciphertext berubah, GCM akan gagal autentikasi dan melempar exception.

### Flag

```text
grodno{suh@r1k1_3_k0r0chk1}
```

### Pelajaran penting

1. Saat point yang diklaim sebagai secp256k1 gagal memenuhi `y² = x³ + 7`, hitung parameter `b` yang benar sebelum mencoba transformasi endian atau decoding lain.
2. Kurva faulted dapat mempunyai order yang sangat lemah walaupun memakai field prime yang sama dengan kurva terkenal.
3. Faktor kecil order grup mengubah discrete log besar menjadi BSGS pada subgroup kecil.
4. Kebocoran beberapa bit nonce ECDSA dari banyak signature dapat diubah menjadi Hidden Number Problem dan diselesaikan menggunakan lattice.
5. Telemetry yang tampak penting belum tentu dipakai oleh attack; selalu verifikasi hipotesis dengan persamaan kriptografi.

### Lampiran — Reproduksi dari Jupyter Notebook

Solve ini juga tersedia dalam notebook:

```text
/home/kconk/Sage_CTF/public/Untitled.ipynb
```

Notebook dijalankan dari folder yang sama dengan `public.zip`, karena cell pertama memakai:

```python
HANDOUT = Path('public.zip')
```

Perintah menjalankan notebook:

```bash
cd /home/kconk/Sage_CTF/public
jupyter notebook Untitled.ipynb
```

Jalankan cell dari atas ke bawah. Urutan cell notebook sama dengan flow challenge ini:

| Cell | Tahap | Fungsi utama |
|---:|---|---|
| 0–3 | Import dan handout | Membaca `capture.log`, `pubkey.txt`, dan `vault.json` |
| 4–5 | Konstanta ECC | Menyiapkan `P`, `N`, generator, operasi titik, dan akar modular |
| 6–7 | Curve fault | Menghitung `CURVE_B = y² − x³ mod P` |
| 8–9 | Generator/order | Memilih `CUSTOM_G`, enumerasi CM twist, dan faktor kecil |
| 10–11 | BSGS | Mengambil delapan nilai `k mod 20412485227` |
| 12–13 | HNP | Mengubah ECDSA menjadi koefisien lattice |
| 14–16 | LLL/Babai | Mencari dan memverifikasi private key |
| 17–18 | AES-GCM | Menurunkan key dari SHA-256 dan membuka vault |
| 19 | Kesimpulan | Menampilkan flag yang diharapkan |

### Output penting notebook

Setelah cell pembacaan handout:

```text
Jumlah signature: 30
Panjang public key: 65 byte
```

Setelah cell rekonstruksi curve:

```text
b standar secp256k1 : 7
b curve faulted     : 0x2c05cf6bee75353e84eb472a5b851b8c872b04c466a9a6ff54a67c3e92ab33d4
```

Setelah cell generator dan order:

```text
Faktor kecil: 20412485227
Ukuran faktor kecil: 34.24873279054833 bit
```

Cell BSGS menghasilkan delapan residue nonce:

```text
[6868297820, 5869273882, 1911394991, 7479030127,
 465143063, 8908077513, 10352945944, 18399395809]
```

Cell HNP menunjukkan quotient nonce memiliki batas:

```text
Bound quotient nonce: 222 bit
```

Cell LLL/Babai lalu mencetak private key:

```text
private_key = df416f62d1208db259780a3e870a7aa417bd9ca6b2546f91ca09ea044b863b31
```

Terakhir, cell AES-GCM memverifikasi tag dan mencetak:

```text
FLAG: grodno{suh@r1k1_3_k0r0chk1}
```

Dengan demikian, notebook dan write-up ini menjalankan attack chain yang sama: faulted curve → subgroup kecil → BSGS → HNP/LLL → private key → AES-GCM → flag.
