#PLEEEEAAAASE DONT READ THIS FUNCTION
def passCheck(password): #JUST SCROLL PAST PLEASE
    check = False
    if len(password) == 40:
        #KEEP SCROLLING
        if password[:9] == "AHSINV{39":
            #if password[10:-15] == "43hd438" :
            if password[25:30] == "9a023": 
                if password[-9:] == "3721ce96}" : 
                    if password[6:16] == "{39ce82729" : 
                        #A LITTLE MORE DOWN
                        if password[-25:-15] == "982dbd69c6" : 
                            if password[-31:-23] == "ce827298" : 
                                if password[16:21] == "82dbd" : 
                                    if password[30:-9] == "b" : 
                                        #ALMOST THERE
                                        if password[32:39] == "721ce96" :
                                            check = True
    return check #YUP KEEP GOING

#The following is the most advanced password checker of the ages
#No one could ever decrypt the password
#It'd be like trying to unscramble an egg...
userpass = input("Enter your password: ")
thelockisopened = passCheck(userpass)

if thelockisopened == True :
    print("The entered password is correct")
else:   
    print("The entered password is incorrect")