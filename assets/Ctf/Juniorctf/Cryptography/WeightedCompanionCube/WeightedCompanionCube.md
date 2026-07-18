### Ringkasan

Challenge memberikan empat berkas:

- `catalog.json`
- `known_archives.json`
- `metadata.json`
- `secret_archive.hex`

Tujuannya adalah mendekripsi arsip rahasia dan memperoleh flag dengan format:

```
grodno{...}
```

### Analisis

Dari `metadata.json`:

```
{
  "note":"Every archive in this batch was encrypted under the same boot-state."
}
```

Kalimat tersebut merupakan petunjuk bahwa seluruh arsip menggunakan keystream yang sama (stream cipher/AES-CTR/OFB dengan nonce/IV yang dipakai ulang).

Secara matematis:
```
Ciphertext = Plaintext XOR Keystream
```
Sehingga:
```
Keystream = Ciphertext XOR Plaintext
```
Jika satu plaintext diketahui, seluruh ciphertext lain dapat didekripsi menggunakan keystream tersebut.

Langkah Penyelesaian :
- Bangun plaintext salah satu arsip yang diketahui berdasarkan format metadata.
- XOR plaintext dengan ciphertext yang sesuai untuk memperoleh keystream.
- Baca secret_archive.hex.
- XOR ciphertext rahasia dengan keystream.
- Plaintext hasil XOR berisi arsip rahasia dan flag.

Rumus
```
KS = C XOR P
P_secret = C_secret XOR KS
```



output :
```
[Aperture Archive]
item=companion cube    
status=calibrating 
sector=omega-01    
memo=grodno{c0mp4n10n_cub3_7h15_15_57r1c7ly_4_m4ny_71m3_p4d}         

```