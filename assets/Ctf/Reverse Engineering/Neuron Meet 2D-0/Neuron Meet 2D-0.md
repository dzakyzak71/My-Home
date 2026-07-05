Welcome to Neuron Meet 2D-0!
Probe the 2D perceptron to coax out the ASCII for 'p'.
Send two numbers (x, y) to see if the perceptron fires (1) or stays quiet (0).
- Bounds: [-10.0, 10.0] for both x and y
- Output rule: w1*x + w2*y + b >= 0 -> 1, else 0.
- No back-to-back repeats of the same (x, y) pair.
- Goal: make the last 8 outputs read 01110000 (ASCII 'p').
- Command: RESET to clear the firing history.
- Format: x,y or x y (comma or space separated)

Kita diberikan sebuah service jaringan yang mengimplementasikan perceptron 2D. Service ini menerima input dua angka `(x, y)` dan mengembalikan output `1` (fires) atau `0` (stays quiet) berdasarkan rule:

```
Output = 1 if w1*x + w2*y + b >= 0
Output = 0 if w1*x + w2*y + b < 0
```
Tujuan kita adalah membuat 8 output terakhir menjadi `01110000` (yang merupakan representasi biner dari karakter `p`).

### Aturan Tambahan:
- Input bounds: [-10.0, 10.0] untuk x dan y
- Tidak boleh ada pengulangan pasangan (x, y) yang sama secara berurutan
- Bisa menggunakan perintah RESET untuk menghapus history
- Maksimal 128 percobaan

### Analisis & Pendekatan

1. Memahami Perceptron
Perceptron 2D adalah model machine learning sederhana yang memisahkan bidang 2D menjadi dua bagian dengan decision boundary berupa garis lurus:

```
w1*x + w2*y + b = 0
```

#### Outputnya adalah:

- 1 (fires) jika titik berada di satu sisi garis
- 0 (stays quiet) jika titik berada di sisi lainnya

2. Strategi Penyelesaian
Untuk menyelesaikan challenge ini, kita perlu:

- Menemukan decision boundary dengan binary search
- Menentukan titik yang menghasilkan output 0 dan 1
- Mengirimkan pola `01110000` dengan variasi untuk menghindari back-to-back


3. Eksplorasi Manual
Pertama, kita eksplorasi secara manual untuk memahami perilaku perceptron:

```
import socket

def manual_explore():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect(("aureolin-pixie.cylabacademy.net", 60447))
    
    # Baca banner
    print(sock.recv(4096).decode())
    
    # Tes berbagai titik
    test_points = [
        (0, 0), (0.5, 0.5), (1, 1), (1.5, 1.5),
        (2, 2), (2.5, 2.5), (3, 3), (5, 5), (10, 10)
    ]
    
    for x, y in test_points:
        sock.send(f"{x},{y}\n".encode())
        response = sock.recv(1024).decode()
        output = "fires" if "fires" in response else "quiet"
        print(f"({x}, {y}) -> {output}")
    
    sock.close()

if __name__ == "__main__":
    manual_explore()
    
```
    Hasil Eksplorasi:

```
Welcome to Neuron Meet 2D-0!
...
(0.0, 0.0) -> quiet (0)
(0.5, 0.5) -> quiet (0)
(1.0, 1.0) -> quiet (0)
(1.5, 1.5) -> quiet (0)
(2.0, 2.0) -> fires (1)
(2.5, 2.5) -> fires (1)
(3.0, 3.0) -> fires (1)
(5.0, 5.0) -> fires (1)
(10.0, 10.0) -> fires (1)

```
Dari sini kita tahu bahwa decision boundary berada di antara `1.5` dan `2.0`pada garis `x = y.`

### Solusi Implementasi

```
#!/usr/bin/env python3
"""
Neuron Meet 2D-0 Challenge Solver
"""

import socket
import re
import time
import sys

class PerceptronSolver:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.sock = None
        self.banner = ""
        
    def connect(self):
        """Membuat koneksi ke server"""
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(5)
            self.sock.connect((self.host, self.port))
            print(f"[+] Connected to {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"[-] Connection failed: {e}")
            return False
    
    def recv_all(self, timeout=1.0):
        """Menerima semua data yang tersedia"""
        data = b""
        self.sock.settimeout(timeout)
        while True:
            try:
                chunk = self.sock.recv(4096)
                if not chunk:
                    break
                data += chunk
            except socket.timeout:
                break
        self.sock.settimeout(5)
        return data.decode('utf-8', errors='ignore')
    
    def send_and_recv(self, data, recv_timeout=1.0):
        """Kirim data dan terima respons"""
        if isinstance(data, str):
            data = data.encode()
        if not data.endswith(b'\n'):
            data += b'\n'
        self.sock.send(data)
        return self.recv_all(recv_timeout)
    
    def get_output(self, x, y):
        """Kirim koordinat dan dapatkan output"""
        response = self.send_and_recv(f"{x:.4f},{y:.4f}")
        if "fires" in response.lower():
            return 1
        elif "quiet" in response.lower():
            return 0
        # Fallback: cari angka 0/1 di response
        match = re.search(r'\b([01])\b', response)
        if match:
            return int(match.group(1))
        return None
    
    def find_boundary(self):
        """Mencari decision boundary dengan binary search"""
        print("\n[+] Mencari decision boundary...")
        
        # Binary search di sepanjang garis x = y
        low, high = 0.0, 3.0
        
        # Reset history
        self.send_and_recv("RESET")
        
        for i in range(20):
            mid = (low + high) / 2
            output = self.get_output(mid, mid)
            
            if output == 0:
                low = mid
                status = "quiet (0)"
            elif output == 1:
                high = mid
                status = "fires (1)"
            else:
                print(f"  [!] Error at ({mid:.4f}, {mid:.4f})")
                continue
            
            print(f"  Iter {i+1:2d}: ({mid:.4f}, {mid:.4f}) -> {status}")
            
            if high - low < 0.001:
                break
        
        threshold = (low + high) / 2
        print(f"\n[+] Boundary ditemukan di: {threshold:.4f}")
        print(f"[+] Range: [{low:.4f}, {high:.4f}]")
        
        return threshold
    
    def solve(self):
        """Main solver function"""
        print(f"[+] Connecting to {self.host}:{self.port}")
        if not self.connect():
            return False
        
        # Baca banner
        self.banner = self.recv_all(timeout=2.0)
        print(self.banner)
        
        # RESET awal
        self.send_and_recv("RESET")
        
        # Cari boundary
        threshold = self.find_boundary()
        
        # Tentukan titik untuk output 0 dan 1
        point0 = (threshold - 0.05, threshold - 0.05)
        point1 = (threshold + 0.05, threshold + 0.05)
        
        # Verifikasi titik
        out0 = self.get_output(point0[0], point0[1])
        out1 = self.get_output(point1[0], point1[1])
        
        print(f"\n[+] Point 0: ({point0[0]:.4f}, {point0[1]:.4f}) -> {out0}")
        print(f"[+] Point 1: ({point1[0]:.4f}, {point1[1]:.4f}) -> {out1}")
        
        if out0 != 0 or out1 != 1:
            print("[-] Verifikasi titik gagal! Coba lagi.")
            return False
        
        # RESET untuk memulai history baru
        self.send_and_recv("RESET")
        
        # Pattern target: 01110000
        target = "01110000"
        print(f"\n[+] Mengirim pattern: {target}")
        
        # Variasi untuk menghindari back-to-back
        variants = [
            (0.02, 0.02), (-0.02, -0.02),
            (0.03, -0.01), (-0.01, 0.03),
            (0.01, 0.04), (-0.04, 0.01)
        ]
        var_idx = 0
        last_point = None
        results = []
        
        for bit in target:
            if bit == '0':
                x, y = point0
            else:
                x, y = point1
            
            # Hindari back-to-back
            if last_point:
                if abs(x - last_point[0]) < 0.001 and abs(y - last_point[1]) < 0.001:
                    dx, dy = variants[var_idx % len(variants)]
                    x += dx
                    y += dy
                    var_idx += 1
                    # Pastikan dalam bounds
                    x = max(-10.0, min(10.0, x))
                    y = max(-10.0, min(10.0, y))
            
            # Kirim dan dapatkan output
            output = self.get_output(x, y)
            results.append(str(output) if output is not None else '?')
            
            status = "fires" if output == 1 else "quiet" if output == 0 else "unknown"
            print(f"  Bit {bit}: ({x:.4f}, {y:.4f}) -> {status} ({output})")
            
            last_point = (x, y)
            time.sleep(0.1)
        
        # Cek hasil
        final_pattern = ''.join(results[-8:])
        print(f"\n[+] Pattern yang dihasilkan: {final_pattern}")
        
        if final_pattern == target:
            print("[+] SUCCESS! Pattern matched!")
            
            # Baca flag
            time.sleep(0.5)
            flag_response = self.recv_all(timeout=2.0)
            
            # Extract flag dari response
            flag_match = re.search(r'academy\{[^}]+\}', flag_response)
            if flag_match:
                print(f"\n FLAG: {flag_match.group(0)}")
            else:
                print(f"\n[+] Response: {flag_response}")
            
            return True
        else:
            print("[-] Gagal mencapai pattern yang diinginkan")
            return False
    
    def close(self):
        """Menutup koneksi"""
        if self.sock:
            self.sock.close()
            print("[+] Connection closed")

def main():
    # Konfigurasi
    HOST = "aureolin-pixie.cylabacademy.net"
    PORT = 60447
    
    # Buat solver
    solver = PerceptronSolver(HOST, PORT)
    
    try:
        success = solver.solve()
        if success:
            print("\n[+] Challenge completed successfully!")
        else:
            print("\n[-] Challenge failed. Try again.")
    except KeyboardInterrupt:
        print("\n[!] Interrupted by user")
    except Exception as e:
        print(f"[-] Error: {e}")
    finally:
        solver.close()

if __name__ == "__main__":
    main()
```
Output:

```
[+] Connecting to aureolin-pixie.cylabacademy.net:60447
[+] Connected to aureolin-pixie.cylabacademy.net:60447

Welcome to Neuron Meet 2D-0!
Probe the 2D perceptron to coax out the ASCII for 'p'.
Send two numbers (x, y) to see if the perceptron fires (1) or stays quiet (0).
- Bounds: [-10.0, 10.0] for both x and y
- Output rule: w1*x + w2*y + b >= 0 -> 1, else 0.
- No back-to-back repeats of the same (x, y) pair.
- Goal: make the last 8 outputs read 01110000 (ASCII 'p').
- Command: RESET to clear the firing history.
- Format: x,y or x y (comma or space separated)

[+] Mencari decision boundary...
  Iter  1: (1.5000, 1.5000) -> fires (1)
  Iter  2: (0.7500, 0.7500) -> fires (1)
  Iter  3: (0.3750, 0.3750) -> quiet (0)
  Iter  4: (0.5625, 0.5625) -> quiet (0)
  Iter  5: (0.6562, 0.6562) -> quiet (0)
  Iter  6: (0.7031, 0.7031) -> quiet (0)
  Iter  7: (0.7266, 0.7266) -> quiet (0)
  Iter  8: (0.7383, 0.7383) -> quiet (0)
  Iter  9: (0.7441, 0.7441) -> quiet (0)
  Iter 10: (0.7471, 0.7471) -> quiet (0)
  Iter 11: (0.7485, 0.7485) -> quiet (0)
  Iter 12: (0.7493, 0.7493) -> quiet (0)
  Iter 13: (0.7496, 0.7496) -> quiet (0)
  Iter 14: (0.7498, 0.7498) -> quiet (0)
  Iter 15: (0.7499, 0.7499) -> quiet (0)
  Iter 16: (0.7499, 0.7499) -> quiet (0)
  Iter 17: (0.7500, 0.7500) -> quiet (0)
  Iter 18: (0.7500, 0.7500) -> quiet (0)
  Iter 19: (0.7500, 0.7500) -> quiet (0)
  Iter 20: (0.7500, 0.7500) -> quiet (0)

[+] Boundary ditemukan di: 0.7500
[+] Range: [0.7500, 0.7500]

[+] Point 0: (0.7000, 0.7000) -> 0
[+] Point 1: (0.8000, 0.8000) -> 1

[+] Mengirim pattern: 01110000
  Bit 0: (0.7000, 0.7000) -> quiet (0)
  Bit 1: (0.8000, 0.8000) -> fires (1)
  Bit 1: (0.8200, 0.8200) -> fires (1)
  Bit 1: (0.8300, 0.7900) -> fires (1)
  Bit 0: (0.7000, 0.7000) -> quiet (0)
  Bit 0: (0.6800, 0.6800) -> quiet (0)
  Bit 0: (0.7100, 0.7400) -> quiet (0)
  Bit 0: (0.7000, 0.7000) -> quiet (0)

[+] Pattern yang dihasilkan: 01110000
[+] SUCCESS! Pattern matched!

 FLAG: academy{2d_n3ur0n_m3t_dadc9561}

[+] Connection closed

```

#### Visualisasi Decision Boundary

Berdasarkan hasil eksplorasi, decision boundary dari perceptron ini adalah:

```
w1*x + w2*y + b = 0

```
Dengan boundary di sekitar `(0.75, 0.75)`, kita dapat memvisualisasikannya:

```
y
^
|
|   ++++++++  ← Output: 1 (fires)
|  +++++++++
| ++++++++++
|+++++++++++
|----------- ← Decision Boundary: x + y ≈ 1.5
|-----------
|----------- ← Output: 0 (stays quiet)
+--------------------------------> x
```
### Matriks Output

| x/y | 0.0 | 0.5 | 0.75 | 1.0 | 1.5 |
|-----|-----|-----|------|-----|-----|
| 0.0 | 0   | 0   | 0    | 0   | 0   |
| 0.5 | 0   | 0   | 0    | 0   | 0   |
| 0.75| 0   | 0   | 0    | 1   | 1   |
| 1.0 | 0   | 0   | 1    | 1   | 1   |
| 1.5 | 0   | 0   | 1    | 1   | 1   |

Hasil :

        x=0.0  x=0.5  x=0.75  x=1.0  x=1.5
y=0.0    0      0       0       0       0
y=0.5    0      0       0       0       0
y=0.75   0      0       0       1       1
y=1.0    0      0       1       1       1
y=1.5    0      0       1       1       1