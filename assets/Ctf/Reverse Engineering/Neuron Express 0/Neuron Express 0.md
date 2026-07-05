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