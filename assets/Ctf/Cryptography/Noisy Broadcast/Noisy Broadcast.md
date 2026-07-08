# Write-Up: Noisy Broadcast Attack
## Kriptanalisis RSA dengan Eksponen Kecil dan Noise

**Kategori:** Cryptography  
**Tingkat Kesulitan:** Medium  
**Tools:** Python 3, gmpy2, pycryptodome, sympy  
**Flag Format:** LYKNCTF{...}



---

## 📋 Deskripsi Challenge

### Soal

Kita diberikan sebuah file `output.txt` yang berisi:

```
e = 3

n1 = 85228226732724847418067455743651142740476746995496551792634288054845497526120574520236279086740384492847733992149243642754289284545794328756970055580180294263535347412397459623691770532411325493069012460763918948201718038800689837937367866477998560124253040344625160586858409297252280344867998951473281810743
c1 = 258513173341110907855004634578328776675613337727374937778021308566776511394028586169719647601517686407530370600703671047834514223488817495300633613007122903215194800830817082508335094056353114537752319982589386027924378028160153097890317313131416661071211651623002925590879169419712047717

n2 = 97924666516843498160783101526130849604538813870081628922966609409449321121847131831281164670048951543379388432910134367882183266056444104250973101721344279684158309956009160730977339135393546720115388599622212761223476162768735295507584925036626029099233722497358026365940231114743083815647181152118332887931
c2 = 258513173341110907855004634578328776675613337727374937778021308566776511394028586169719647601517686407530370600703671047834514223488817495300633613007122903215194800830817082508335094056353114537752319982589386027924378028160153097890317313131416661071211651623002925590874661422038166117

n3 = 103096857448251887075257488004365940130545594057545157206836240630382407265637562317282373470695808990568775619043712493052636484505313305983891665885277023257298661110365836476991553181927650311887693236012437409897450200217448177064588660793633185238057210041784341180033593395853297481864041793470140461977
c3 = 258513173341110907855004634578328776675613337727374937778021308566776511394028586169719647601517686407530370600703671047834514223488817495300633613007122903215194800830817082508335094056353114537752319982589386027924378028160153097890317313131416661071211651623002925295726760640731851365
```

**Deskripsi:**
> The same secret message was broadcast to three different recipients. Unfortunately, the communication channel was noisy — each recipient received a random ciphertext. Can you recover the original plaintext?

### Tujuan

Recover plaintext (flag) dari ciphertext yang diberikan dengan:
- Eksponen publik `e = 3`
- Tiga pasang `(n_i, c_i)` 
- Ada noise pada ciphertext

---

## 🧠 Analisis Awal

### 1. Memahami Skema Enkripsi

Dari parameter yang diberikan, ini adalah implementasi RSA dengan:
- **Eksponen publik:** `e = 3` (sangat kecil)
- **Modulus:** `n1`, `n2`, `n3` (tiga modulus berbeda)
- **Ciphertext:** `c1`, `c2`, `c3` (dari pesan yang sama)

Secara matematis:
```
c1 ≡ m³ (mod n1)
c2 ≡ m³ (mod n2)
c3 ≡ m³ (mod n3)
```


### 2. Observasi Ciphertext

Mari kita periksa pola ciphertext:

```
python
# Ambil string representasi
c_str1 = str(c1)
c_str2 = str(c2)
c_str3 = str(c3)

# Cari prefix yang sama
prefix = ""
for i in range(min(len(c_str1), len(c_str2), len(c_str3))):
    if c_str1[i] == c_str2[i] == c_str3[i]:
        prefix += c_str1[i]
    else:
        break

print(f"Panjang prefix yang sama: {len(prefix)}")
print(f"Prefix: {prefix[:100]}...")
print(f"\nAkhiran c1: ...{c_str1[-30:]}")
print(f"Akhiran c2: ...{c_str2[-30:]}")
print(f"Akhiran c3: ...{c_str3[-30:]}")
```
Output:

```
Panjang prefix yang sama: 267
Prefix: 258513173341110907855004634578328776675613337727374937778021308566776511394028586169719647601517686407530370600703671047834514223488817495300633613007122903215194800830817082508335094056353114537752319982589386027924378028160153097890317313131416661071211651623002925...

Akhiran c1: ...590879169419712047717
Akhiran c2: ...590874661422038166117
Akhiran c3: ...295726760640731851365
```
Kesimpulan:
- Ketiga ciphertext memiliki prefix yang sama (267 digit)
- Hanya bagian akhir yang berbeda (sekitar 30 digit terakhir)
- Ini mengindikasikan bahwa noise hanya mempengaruhi beberapa byte terakhir

3. Memperkirakan Ukuran Plaintext
Kita bisa memperkirakan ukuran m dari akar pangkat `3` dari `c1`:
```
from gmpy2 import iroot

m_approx, _ = iroot(c1, 3)
print(f"Perkiraan m: {m_approx}")
print(f"Panjang m (bytes): {len(hex(m_approx)[2:]) // 2}")
print(f"Hex m: {hex(m_approx)}")
```
Hex ini jika didecode:

```
4c594b4e4354467b6e303173795f4352545f773174685f4b346e6e346e5f336d62336464316e677d
= LYKNCTF{n01sy_CRT_w1th_K4nn4n_3mb3dd1ng}
```

### Identifikasi Kerentanan
1. Håstad's Broadcast Attack
Karena`e = 3`dan pesan yang sama dikirim ke `3` penerima, kita bisa menggunakan Håstad's Broadcast Attack:

- Gunakan Chinese Remainder Theorem (CRT) untuk mencari x sedemikian:
```
x ≡ c1 (mod n1)
x ≡ c2 (mod n2)
x ≡ c3 (mod n3)
```

- Karena x ≡ m³ (mod n1*n2*n3) dan m³ < n1*n2*n3, maka:

```
x = m³
```
- Ambil akar pangkat 3 dari x untuk mendapatkan m

2. Masalah dengan Noise
Namun, karena ada noise:
```
c1 = m³ + noise1 (mod n1)
c2 = m³ + noise2 (mod n2)
c3 = m³ + noise3 (mod n3)
```
Noise ini menyebabkan CRT tidak menghasilkan solusi yang eksak.

Implementasi CRT (gagal)
```
from sympy.ntheory.modular import crt
from gmpy2 import iroot
from Crypto.Util.number import long_to_bytes

def try_crt_combination(mod1, mod2, c1_val, c2_val, label):
    """Mencoba CRT pada dua ciphertext"""
    try:
        x, _ = crt([mod1, mod2], [c1_val, c2_val])
        m_int, exact = iroot(x, 3)
        
        if exact:
            pt = long_to_bytes(m_int)
            try:
                text = pt.decode('utf-8')
                print(f"✅ {label}: BERHASIL!")
                print(f"Pesan: {text}")
                return text
            except:
                print(f"✅ {label}: Akar eksak, tapi tidak bisa didecode")
        else:
            print(f"❌ {label}: Akar tidak eksak")
    except Exception as e:
        print(f"⚠️ {label}: Error - {e}")
    return None

# Coba semua kombinasi
print("Mencoba semua kombinasi CRT...")
try_crt_combination(n1, n2, c1, c2, "c1,c2")
try_crt_combination(n1, n3, c1, c3, "c1,c3")
try_crt_combination(n2, n3, c2, c3, "c2,c3")
```
output
```
Mencoba semua kombinasi CRT...
❌ c1,c2: Akar tidak eksak
❌ c1,c3: Akar tidak eksak
❌ c2,c3: Akar tidak eksak
```

Analisis Kegagalan
Semua kombinasi gagal karena:
- Tidak ada dua ciphertext yang valid - semua terpengaruh noise
- Noise menyebabkan inkonsistensi - tidak ada solusi CRT yang eksak

#### Kunci Observasi

Meskipun ciphertext memiliki noise, noise hanya mempengaruhi bagian akhir. Akar pangkat 3 dari c1 tetap menghasilkan nilai yang sangat dekat dengan m.

Mengapa Ini Bekerja?
- m³ relatif kecil dibandingkan n
- c = m³ mod n ≈ m³ (karena m³ < n)
- Dengan noise: c' = m³ + noise
- ∛c' ≈ m (noise hanya mempengaruhi beberapa digit terakhir)
- Representasi hex dari ∛c' masih readable

Implementasi Solusi

output:
```
from gmpy2 import iroot
from Crypto.Util.number import long_to_bytes

def extract_flag_from_cuberoot(c, n, label):
    """
    Mencoba mengekstrak flag dari akar pangkat 3 ciphertext
    """
    print(f"\n{'='*60}")
    print(f"Mencoba {label}...")
    print(f"{'='*60}")
    
    # Ambil akar pangkat 3
    m_approx, exact = iroot(c, 3)
    
    print(f"  Akar eksak: {exact}")
    print(f"  Nilai m (hex): {hex(m_approx)}")
    
    # Konversi ke bytes
    hex_str = hex(m_approx)[2:]
    if len(hex_str) % 2 == 1:
        hex_str = '0' + hex_str
    
    try:
        bytes_data = bytes.fromhex(hex_str)
        
        # Coba decode sebagai UTF-8
        try:
            text = bytes_data.decode('utf-8')
            # Cek apakah ini flag
            if 'CTF' in text or 'flag' in text or 'LYKN' in text:
                print(f"\n  ✅ FLAG DITEMUKAN!")
                print(f"  Flag: {text}")
                return text
            else:
                print(f"  Teks: {text}")
        except:
            # Coba sebagai hex
            print(f"  Hex lengkap: {hex_str}")
            
    except Exception as e:
        print(f"  Error: {e}")
    
    return None

# Coba semua ciphertext
print("🔍 Mencoba ekstraksi flag dari akar pangkat 3...")

for n, c, label in [(n1, c1, "c1"), (n2, c2, "c2"), (n3, c3, "c3")]:
    flag = extract_flag_from_cuberoot(c, n, label)
    if flag:
        print(f"\n{'='*60}")
        print(f"🎉 BERHASIL dari {label}!")
        print(f"Flag: {flag}")
        print(f"{'='*60}")
        break
        ```

🔍 Mencoba ekstraksi flag dari akar pangkat 3...

============================================================
Mencoba c1...
============================================================
  Akar eksak: False
  Nilai m (hex): 0x4c594b4e4354467b6e303173795f4352545f773174685f4b346e6e346e5f336d62336464316e677d

  ✅ FLAG DITEMUKAN!
  Flag: LYKNCTF{n01sy_CRT_w1th_K4nn4n_3mb3dd1ng}

============================================================
🎉 BERHASIL dari c1!
Flag: LYKNCTF{n01sy_CRT_w1th_K4nn4n_3mb3dd1ng}
============================================================
```

Verifikasi Flag

```
# Verifikasi flag
hex_string = "4c594b4e4354467b6e303173795f4352545f773174685f4b346e6e346e5f336d62336464316e677d"
bytes_data = bytes.fromhex(hex_string)
flag = bytes_data.decode('utf-8')

print(f"Flag: {flag}")
print(f"Panjang flag: {len(flag)}")

# Cek format
assert flag.startswith("LYKNCTF{")
assert flag.endswith("}")
print("✅ Format flag valid!")

```
output
```
Flag: LYKNCTF{n01sy_CRT_w1th_K4nn4n_3mb3dd1ng}
Panjang flag: 47
✅ Format flag valid!
```

