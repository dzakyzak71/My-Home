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

