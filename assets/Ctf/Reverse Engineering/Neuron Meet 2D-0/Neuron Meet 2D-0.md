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