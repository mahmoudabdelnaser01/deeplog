import hashlib
from math import gcd

def rsa_keys(p, q):
    n = p * q
    phi = (p - 1) * (q - 1)

    e = 65537
    while gcd(e, phi) != 1:
        e += 2

    d = pow(e, -1, phi)  # modular inverse
    return (e, n), (d, n)

def encrypt(text, key):
    e, n = key
    return [pow(ord(c), e, n) for c in text]

def decrypt(cipher, key):
    d, n = key
    return ''.join(chr(pow(c, d, n)) for c in cipher)

def sha256_hash(data):
    return hashlib.sha256(str(data).encode()).hexdigest()


# ===== MAIN =====
p = int(input("Enter p: "))
q = int(input("Enter q: "))

public, private = rsa_keys(p, q)

print(f"\nPublic Key: {public}")
print(f"Private Key: {private}")

text = input("\nEnter text: ")

if any(ord(c) >= public[1] for c in text):
    print("Error: n is too small for this text. Choose larger primes!")
    exit()

# Encryption
cipher = encrypt(text, public)
print(f"\nEncrypted: {cipher}")

# Hash 
hash_original = sha256_hash(text)
hash_cipher = sha256_hash(cipher)

print(f"\nSHA-256 (Original Text): {hash_original}")
print(f"SHA-256 (Cipher): {hash_cipher}")

# Decryption
decrypted = decrypt(cipher, private)
print(f"\nDecrypted: {decrypted}")

# Verification 
hash_after = sha256_hash(decrypted)
print("\nVerification:", hash_original == hash_after)