
### Deskripsi

Diberikan sebuah arsip ZIP yang dilindungi password berisi sepuluh email phishing. Tugas kita adalah menemukan email yang mendistribusikan lampiran PDF dengan kedok notifikasi perbankan, kemudian mengambil dua informasi berikut:

* Nama file PDF secara lengkap.
* Identifier yang berada setelah teks **`Fatura Emitida -`** pada Subject email.

Format flag:

```
grodno{filename_subjectid}
```

Contoh:

```
grodno{invoice.pdf_abcd1234}
```

---

### Analisis

#### Langkah 1 - Mengekstrak Arsip

Pada challenge telah diberikan password untuk membuka arsip ZIP.

```
Password: Infected
```

Karena arsip menggunakan enkripsi **WinZip AES-256**, utilitas `unzip` bawaan Linux umumnya tidak dapat mengekstraknya. Pada Arch Linux saya menggunakan **7-Zip**.

Jika belum terpasang, install terlebih dahulu.

```
sudo pacman -S 7zip
```

Kemudian ekstrak arsip.

```
7z x "Invoice Without a Bank.protected.zip" -pInfected
```

Output:

```
Everything is Ok

Folders: 1
Files: 10
```

Hasil ekstraksi menghasilkan folder:

```
public/emails/
```

yang berisi sepuluh file email berformat `.eml`.

---

#### Langkah 2 - Mencari Email yang Relevan

Dari deskripsi challenge diketahui bahwa email yang dicari memiliki Subject dengan format:

```
Fatura Emitida - <identifier>
```

Karena itu kita dapat melakukan pencarian menggunakan `grep`.

```
cd public/emails

grep -R "Fatura Emitida" .
```

Output:

```
./sample-717.eml:Subject: Fatura Emitida - 6ZFYeMmltso
```

Hanya terdapat **satu email** yang mengandung string tersebut, sehingga dapat dipastikan bahwa file **sample-717.eml** merupakan email target.

---

## Langkah 3 - Mengambil Identifier pada Subject

Selanjutnya kita membaca header Subject.

```
grep "^Subject:" sample-717.eml
```

Output:

```
Subject: Fatura Emitida - 6ZFYeMmltso
```

Sesuai petunjuk soal, identifier yang diminta adalah bagian setelah teks:

```
Fatura Emitida -
```

Sehingga diperoleh identifier:

```
6ZFYeMmltso
```

---

#### Langkah 4 - Mengambil Nama Lampiran PDF

Challenge juga meminta nama file PDF yang dikirimkan pada email tersebut.

Karena file `.eml` merupakan format MIME, informasi nama attachment dapat ditemukan pada header `Content-Disposition`.

Pencarian dilakukan menggunakan:

```
grep -i 'filename=' sample-717.eml
```

Output:

```
filename="Vl6s3kCIKaUvwaUAeY.pdf"
```

Dengan demikian nama file PDF yang dikirimkan adalah:

```
Vl6s3kCIKaUvwaUAeY.pdf
```

---

#### Langkah 5 - Menyusun Flag

Format flag yang diberikan adalah:

```
grodno{filename_subjectid}
```

Sehingga:

* Filename

```
Vl6s3kCIKaUvwaUAeY.pdf
```

* Subject Identifier

```
6ZFYeMmltso
```

Maka flag akhirnya adalah:

```
grodno{Vl6s3kCIKaUvwaUAeY.pdf_6ZFYeMmltso}
```

---

### Flag

```
grodno{Vl6s3kCIKaUvwaUAeY.pdf_6ZFYeMmltso}
```

---

### Kesimpulan

Challenge ini menguji kemampuan dasar analisis email phishing tanpa perlu melakukan reverse engineering terhadap lampiran PDF. Clue pada deskripsi soal sudah mengarahkan kita untuk mencari Subject dengan format tertentu, sehingga proses investigasi dapat dilakukan dengan cepat menggunakan utilitas sederhana seperti `grep`.

Alur penyelesaiannya adalah:

1. Mengekstrak arsip ZIP menggunakan password yang diberikan.
2. Mencari email dengan Subject yang mengandung `Fatura Emitida`.
3. Mengambil identifier dari Subject.
4. Mengambil nama file PDF dari header MIME (`filename=`).
5. Menyusun flag sesuai format yang diminta.

Teknik seperti ini sangat umum digunakan dalam challenge Forensics bertema Email, sehingga pemanfaatan tool bawaan Linux seperti `grep`, `less`, `cat`, maupun `ripgrep` akan sangat membantu mempercepat proses investigasi.
