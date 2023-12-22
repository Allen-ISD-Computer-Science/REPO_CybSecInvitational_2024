import random
import hashlib

# Generate a random 12-character string
random_str = ''.join(random.choices('0123456789abcdef', k=12))

# Calculate the MD5 checksum of the string
md5_checksum = hashlib.md5(random_str.encode()).hexdigest()

# Print the desired output
print('AHSINV{{{}}}'.format(md5_checksum))
