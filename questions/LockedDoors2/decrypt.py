def read_file_content(file_path):
    with open(file_path, 'r') as file:
        content = file.read()
    return content
def password(key, passwordGiven):
    if key == passwordGiven:
        return True
    return False
passwd = input("Type your password: ")
key = read_file_content("paswd")
ascii_values_str = read_file_content("asciiKey")

ascii_values = [int(value) for value in ascii_values_str.split(',')]

result_string = ''.join([chr(value) for value in ascii_values])
check = password(key, passwd)
if check == True:
    print("Reconverted string:", result_string)
else:
    print("wrong")