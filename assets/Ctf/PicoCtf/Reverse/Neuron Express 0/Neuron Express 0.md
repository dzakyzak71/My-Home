"Now you know the math behind perceptrons. Your challenge: express what you learned from the black-box perceptron in 1D as a mathematical formula."

Kita diberikan sebuah perceptron 1D yang berjalan sebagai service network. Tugas kita adalah:

- Menghubungi server melalui netcat
- Mengirimkan nilai integer dalam rentang `[-10, 10]`
- Mengamati apakah perceptron fire `(output 1)` atau stays quiet `(output 0)`
- Menentukan nilai weight `(w)` dan bias `(b)`
- Mengirimkan tebakan dengan perintah `TEST w b`

### Konsep Dasar Perceptron 1D

Perceptron 1D memiliki rumus matematis:

```
f(x) = 1 jika w*x + b >= 0
f(x) = 0 jika w*x + b < 0
```
Dimana:
- x = input (dalam kasus ini integer dari -10 sampai 10)
- w = weight (bobot)
- b = bias
- f(x) = output (1 = fire, 0 = quiet)

Untuk perceptron 1D, hanya ada satu threshold yang perlu ditemukan. Threshold adalah titik di mana output berubah dari 0 menjadi 1 atau sebaliknya.

#### Langkah-langkah Penyelesaian
Step 1: Koneksi ke Server
Pertama, kita koneksi ke server menggunakan `netcat`:
```
nc aureolin-pixie.cylabacademy.net 52893
```
Output:
```
Welcome to Neuron Express 0!
Probe the 1D perceptron, then submit its weight and bias.
Send an integer within the bounds to see if the perceptron fires (1) or stays quiet (0).
- Bounds: [-10, 10]
- Output rule: w*x + b >= 0 -> 1, else 0.
- Command: TEST w b to submit a weight and bias guess.
- The guess must match outputs for every integer x in range.
Type HELP for a reminder or EXIT to quit.

[1/128] x>
```
Server memberikan informasi:
- Bounds: [-10, 10] (kita hanya bisa mengirim angka dalam rentang ini)
- Output rule: `w*x + b` >= 0 => output 1, else 0
- Command: `TEST w b` untuk submit tebakan

Step 2: Probing (Eksplorasi)
Kita perlu mem-probe perceptron dengan mengirimkan berbagai nilai input dan mencatat outputnya.

Kirim angka satu per satu:

```
x> -10
Perceptron stays quiet.
[2/128] x> -9
Perceptron stays quiet.
[3/128] x> -8
Perceptron stays quiet.
[4/128] x> -7
Perceptron stays quiet.
[5/128] x> -6
Perceptron stays quiet.
[6/128] x> -5
Perceptron stays quiet.
[7/128] x> -4
Perceptron stays quiet.
[8/128] x> -3
Perceptron stays quiet.
[9/128] x> -2
Perceptron stays quiet.
[10/128] x> -1
Perceptron stays quiet.
[11/128] x> 0
Perceptron stays quiet.
[12/128] x> 1
Perceptron stays quiet.
[13/128] x> 2
Perceptron fires!
[14/128] x> 3
Perceptron fires!
[15/128] x> 4
Perceptron fires!
[16/128] x> 5
Perceptron fires!
[17/128] x> 6
Perceptron fires!
[18/128] x> 7
Perceptron fires!
[19/128] x> 8
Perceptron fires!
[20/128] x> 9
Perceptron fires!
[21/128] x> 10
Perceptron fires!
```
Step 3: Analisis Hasil Probing
Mari kita buat tabel hasil probing:

```
## 📊 Tabel Hasil Probing Perceptron

| Input (x) | Output | Keterangan |
|-----------|--------|------------|
| -10 | 0 | Stays quiet |
| -9 | 0 | Stays quiet |
| -8 | 0 | Stays quiet |
| -7 | 0 | Stays quiet |
| -6 | 0 | Stays quiet |
| -5 | 0 | Stays quiet |
| -4 | 0 | Stays quiet |
| -3 | 0 | Stays quiet |
| -2 | 0 | Stays quiet |
| -1 | 0 | Stays quiet |
| 0 | 0 | Stays quiet |
| 1 | 0 | Stays quiet |
| **2** | **1** | **Fires!** ⚡ |
| 3 | 1 | Fires! |
| 4 | 1 | Fires! |
| 5 | 1 | Fires! |
| 6 | 1 | Fires! |
| 7 | 1 | Fires! |
| 8 | 1 | Fires! |
| 9 | 1 | Fires! |
| 10 | 1 | Fires! |
```

Observasi Penting:

- Output berubah dari 0 → 1 pada x = 2
- Semua nilai x < 2 menghasilkan output 0
- Semua nilai x ≥ 2 menghasilkan output 1

Kesimpulan: Threshold perceptron adalah x = 2

Step 4: Menentukan w dan b
Dari hasil probing, kita tahu perceptron fire ketika x ≥ 2.

Rumus perceptron: `w*x + b >= 0`

Untuk `x = 2` (threshold):

```
w*2 + b = 0
```
Untuk `x = 1` (sebelum threshold):

```
w*1 + b < 0
```
Kita bisa memilih `w = 1` (paling sederhana), maka:

```
1*2 + b = 0
2 + b = 0
b = -2
```
Verifikasi:

Untuk x = `2: 1*2 + (-2) = 0` → fire 

Untuk x = `1: 1*1 + (-2) = -1` → tidak fire 

Untuk x = `-10: 1*(-10) + (-2) = -12` → tidak fire 

Jadi solusinya:
```
w = 1
b = -2
```
Step 5: Submit Tebakan
Kirim perintah TEST dengan w=1 dan b=-2:

```
TEST 1 -2
```

Output:

```
Perfect match! Here is your flag:
academy{n3ur0n_expr_45fba694}
```

Sript Full
```
#!/usr/bin/env python3
import socket
import time
import re

def probe_perceptron(host, port):
    """Fungsi untuk mem-probe perceptron dan mencari threshold"""
    
    # Koneksi ke server
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))
    
    # Baca welcome message
    data = ""
    while "x>" not in data:
        data += s.recv(1024).decode()
    print(data)
    
    print("\n[*] Probing perceptron...")
    print("-" * 50)
    
    results = {}
    
    # Probe semua nilai dari -10 sampai 10
    for x in range(-10, 11):
        s.send(f"{x}\n".encode())
        time.sleep(0.2)
        
        response = ""
        while True:
            chunk = s.recv(1024).decode()
            response += chunk
            if "fires" in chunk or "quiet" in chunk:
                break
            if "x>" in chunk:
                break
            time.sleep(0.1)
        
        # Tentukan output
        if "fires" in response:
            output = 1
            status = "fires!"
        elif "quiet" in response:
            output = 0
            status = "stays quiet"
        else:
            output = None
            status = "?"
        
        results[x] = output
        print(f"x={x:3d} → {output} ({status})")
        time.sleep(0.1)
    
    print("\n" + "=" * 50)
    print("[*] Analisis Hasil:")
    print("-" * 50)
    
    # Cari threshold
    fire_values = [x for x, out in results.items() if out == 1]
    not_fire_values = [x for x, out in results.items() if out == 0]
    
    print(f"Fire (1): {fire_values}")
    print(f"Not Fire (0): {not_fire_values}")
    
    if fire_values and not_fire_values:
        min_fire = min(fire_values)
        max_not_fire = max(not_fire_values)
        
        print(f"\n[*] Threshold ditemukan: x = {min_fire}")
        print(f"[*] Perceptron fire untuk x >= {min_fire}")
        
        # Tentukan w dan b
        w = 1
        b = -min_fire
        
        print(f"\n[*] Solusi:")
        print(f"    w = {w}")
        print(f"    b = {b}")
        print(f"    Rumus: {w}*x + ({b}) >= 0 → x >= {min_fire}")
        
        # Verifikasi
        print("\n[*] Verifikasi:")
        for x in range(-10, 11):
            pred = 1 if (w * x + b) >= 0 else 0
            check = "✓" if pred == results[x] else "✗"
            print(f"    x={x:3d}: {w}*{x}+{b}={w*x+b:3d} → {pred} (expected: {results[x]}) {check}")
        
        # Submit
        print(f"\n[*] Submit: TEST {w} {b}")
        s.send(f"TEST {w} {b}\n".encode())
        time.sleep(0.5)
        
        response = s.recv(2048).decode()
        print("\n" + "=" * 50)
        print("[*] Response dari server:")
        print(response)
        
        # Cari flag
        flag_match = re.search(r'flag\{[^}]+\}', response, re.IGNORECASE)
        if flag_match:
            print(f"\n[+] FLAG BERHASIL: {flag_match.group()}")
        elif "flag" in response.lower():
            print("[+] Flag ditemukan di response!")
    
    s.close()
    return results

if __name__ == "__main__":
    HOST = "aureolin-pixie.cylabacademy.net"
    PORT = 52893  # Sesuaikan dengan port yang diberikan
    probe_perceptron(HOST, PORT)
    ```
    output

```
Welcome to Neuron Express 0!
...
[*] Probing perceptron...
--------------------------------------------------
x=-10 → 0 (stays quiet)
x= -9 → 0 (stays quiet)
...
x=  2 → 1 (fires!)
x=  3 → 1 (fires!)
...
==================================================
[*] Analisis Hasil:
--------------------------------------------------
Fire (1): [2, 3, 4, 5, 6, 7, 8, 9, 10]
Not Fire (0): [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1]

[*] Threshold ditemukan: x = 2
[*] Perceptron fire untuk x >= 2

[*] Solusi:
    w = 1
    b = -2
    Rumus: 1*x + (-2) >= 0 → x >= 2

[*] Submit: TEST 1 -2
==================================================
[*] Response dari server:
Perfect match! Here is your flag:
academy{n3ur0n_expr_45fba694}

[+] FLAG BERHASIL: academy{n3ur0n_expr_45fba694}
```

