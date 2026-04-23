def RC4(text, key):
    T = []
    S = list(range(256))
    #KSA
    for i in range(256):
        T.append(key[i % len(key)])
    j = 0
    for i in range(256):
        j = (S[i] + T[i] + j) % 256
        S[i], S[j] = S[j], S[i]
    #PRGA
    keystream = []
    i = 0
    for i in range(len(text)):
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        id = (S[i] + S[j]) % 256
        keystream.append(S[id])
    result = [i^j for i, j in zip(text, keystream)]
    return bytes(result)

text = "This is a test string to encrypt using RC4 algo."
key = "RC4"
text_bytes = text.encode()
key = key.encode()
ciphertext = RC4(text_bytes, key)
plaintext = RC4(ciphertext, key)

print("-------------------------------")
print("Cipher Text:\n", ciphertext)
print("-------------------------------")
print("Plain Text:", plaintext.decode())
