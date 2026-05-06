import math

def is_prime(num):
    if num <= 1:
        return False
    if num <= 3:
        return True
    if num % 2 == 0 or num % 3 == 0:
        return False
    
    for i in range(2, int(math.sqrt(num)) + 1):
        if num % i == 0:
            return False
    
    return True

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def find_e(phi):
    for e in range(2, phi):
        if gcd(e, phi) == 1:
            return e
    return None

def find_d(e, phi):
    for d in range(1, phi):
        if (d * e) % phi == 1:
            return d
    return None

# User Input
p = int(input("Enter first prime number: "))
q = int(input("Enter second prime number: "))

if not is_prime(p):
    print("First number is not prime!")
elif not is_prime(q):
    print("Second number is not prime!")
else:
    n = p * q
    phi = (p - 1) * (q - 1)
    
    # Auto calculate e and d5
    e = find_e(phi)
    d = find_d(e, phi)
    
    if e is None or d is None:
        print("Error: Could not find valid e and d values!")
    else:
        m = int(input("Enter message to encrypt: "))
        
        # Encryption
        c = (m ** e) % n
        
        # Decryption
        plain = (c ** d) % n
        
        print("Public key:", (e, n))
        print("Private key:", (d, n))
        print("Encrypted Message:", c)
        print("Decrypted Message:", plain)