####  Analisis Awal

Saat terhubung ke server menggunakan `netcat`, kita mendapatkan respons berikut:

```
bash
$ nc 51.79.140.18 18863
{"message": "user=guest&role=viewer", "message_hex": "757365723d677565737426726f6c653d766965776572", "token": "fbe38bb06de3eff375662f38d810b257207e3aaaa45f88c63fb1b987325298bb"}
Submit one JSON line with msg and tag.
>
```

Poin Penting:
- Algoritma: Token menggunakan SHA-256 (panjang 64 karakter hex)
- Format Input: Server meminta JSON dengan key "msg" dan "tag"
- Parsing Query String: Message menggunakan format key=value&key=value
- Tujuan: Mengubah role=viewer menjadi role=admin


#### Skema Token yang Diduga
Server kemungkinan menggunakan skema:
```
token = SHA256(secret_key + message)
```

di mana secret_key tidak diketahui oleh kita.

Mengapa Ini Rentan?
 Skema SHA256(secret + message) rentan terhadap Hash Length Extension Attack karena:
- SHA-256 adalah algoritma Merkle-Damgård yang bekerja dengan memproses data dalam blok
- Hash akhir adalah state internal setelah memproses semua blok
- Jika kita tahu hash dari secret + message, kita bisa melanjutkan hashing dengan data tambahan tanpa tahu secret

Cara Kerja Serangan:
```
State awal (IV) → Proses "secret" → Proses "message" → Hash (state akhir)

Untuk serangan:
Hash yang diketahui = state setelah "secret + message"
Kita bisa lanjutkan: state → padding → append data → hash baru
```
Langkah 1: Menemukan Panjang Secret
Karena kita tidak tahu panjang secret_key, kita perlu brute-force. Rentang umum adalah 8-32 bytes.


Payload uji: &role=admin


```
import hashpumpy

for secret_len in range(8, 33):
    new_hash, new_msg = hashpumpy.hashpump(
        original_hash,  # Hash yang diketahui
        "user=guest&role=viewer",  # Message asli
        "&role=admin",  # Data yang ditambahkan
        secret_len
    )
    # Kirim ke server dan cek validasi
    ```

Hasil: Panjang secret = 16 bytes ditemukan valid.

Langkah 2: Menentukan Payload yang Tepat
Server kemungkinan menggunakan parser query string yang mengambil nilai terakhir jika ada parameter duplikat.

Payload yang diuji:

Payload	Hasil
```
&role=admin	✅ Token valid, tapi admin: false
&user=admin&role=admin	❌ admin: false
&user=admin	❌ admin: false
&admin=true	✅ admin: true + FLAG!
```

script final 
```
#!/usr/bin/env python3
"""
LYKNCTF 2024 - Hash & Dash
Hash Length Extension Attack on SHA-256
"""

from pwn import *
import hashpumpy
import json
import re
import sys

# ===== KONFIGURASI =====
HOST = "51.79.140.18"
PORT = 18863
SECRET_LENGTH = 16  # Ditemukan melalui brute-force

# ===== FUNGSI UTAMA =====
def solve():
    log.info(f"Target: {HOST}:{PORT}")
    log.info(f"Secret Length: {SECRET_LENGTH}")
    
    # Daftar payload yang akan dicoba
    payloads = [
        "&user=admin&role=admin",
        "&user=admin",
        "&admin=true",
        "&admin=1"
    ]
    
    for idx, append_data in enumerate(payloads, 1):
        log.info(f"[{idx}/{len(payloads)}] Mencoba payload: {append_data}")
        
        try:
            # Connect ke server
            io = remote(HOST, PORT)
            
            # Terima data awal
            raw_data = io.recvuntil(b">").decode()
            log.debug(f"Raw: {raw_data[:200]}...")
            
            # Ekstrak JSON
            json_match = re.search(r'\{.*?\}', raw_data)
            if not json_match:
                log.error("Tidak ditemukan JSON dalam response")
                io.close()
                continue
                
            server_data = json.loads(json_match.group())
            original_msg = server_data["message"]
            original_hash = server_data["token"]
            
            log.debug(f"Original: {original_msg}")
            log.debug(f"Hash: {original_hash[:16]}...")
            
            # === LENGTH EXTENSION ATTACK ===
            new_hash, new_msg_bytes = hashpumpy.hashpump(
                original_hash,   # Hash asli
                original_msg,    # Message asli
                append_data,     # Data tambahan
                SECRET_LENGTH    # Panjang secret
            )
            
            # Konversi ke hex (dibutuhkan server)
            new_msg_hex = new_msg_bytes.hex()
            
            # Buat payload
            payload = {
                "msg": new_msg_hex,
                "tag": new_hash
            }
            
            log.debug(f"Payload: {json.dumps(payload)[:100]}...")
            
            # Kirim ke server
            io.sendline(json.dumps(payload).encode())
            
            # Terima response
            response = io.recvline().decode().strip()
            log.info(f"Response: {response}")
            
            # Cek apakah berhasil
            if '"admin": true' in response:
                log.success("✅ AKSES ADMIN DIDAPATKAN!")
                
                # Ekstrak flag
                flag_match = re.search(r'"flag":\s*"([^"]+)"', response)
                if flag_match:
                    flag = flag_match.group(1)
                    log.success(f"🏁 FLAG: {flag}")
                else:
                    log.info(f"Response lengkap: {response}")
                
                io.close()
                return response
                
            io.close()
            
        except EOFError:
            log.warning("Koneksi ditutup server, mencoba ulang...")
            io.close()
            continue
        except Exception as e:
            log.error(f"Error: {e}")
            io.close()
            continue
    
    log.error("❌ Gagal mendapatkan flag dengan semua payload")
    return None

# ===== MAIN =====
if __name__ == "__main__":
    # Setup logging
    context.log_level = "info"
    
    # Banner
    print("="*60)
    print("  LYKNCTF 2024 - Hash & Dash")
    print("  Hash Length Extension Attack")
    print("="*60)
    
    solve()
    ```
    output:
```
$ python3 solve.py
============================================================
  LYKNCTF 2024 - Hash & Dash
  Hash Length Extension Attack
============================================================
[*] Target: 51.79.140.18:18863
[*] Secret Length: 16
[*] [1/4] Mencoba payload: &user=admin&role=admin
[+] Opening connection to 51.79.140.18 on port 18863: Done
[*] Response: {"ok": true, "admin": false, "error": "token valid but no admin grant"}
[*] Closed connection to 51.79.140.18 port 18863

[*] [2/4] Mencoba payload: &user=admin
[+] Opening connection to 51.79.140.18 on port 18863: Done
[*] Response: {"ok": true, "admin": false, "error": "token valid but no admin grant"}
[*] Closed connection to 51.79.140.18 port 18863

[*] [3/4] Mencoba payload: &admin=true
[+] Opening connection to 51.79.140.18 on port 18863: Done
[*] Response: {"ok": true, "admin": true, "flag": "LYKNCTF{d72f6bb031824c5c9eec068b4e1edae3}"}
[+] ✅ AKSES ADMIN DIDAPATKAN!
[+] 🏁 FLAG: LYKNCTF{d72f6bb031824c5c9eec068b4e1edae3}
[*] Closed connection to 51.79.140.18 port 18863
```

flag 
```
LYKNCTF{d72f6bb031824c5c9eec068b4e1edae3}
```