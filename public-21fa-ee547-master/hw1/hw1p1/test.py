def calcFactorial(x):
    factorial = 1.0
    while (x>0):
        factorial = x * factorial
        x -= 1.0
    return int(factorial)

print(calcFactorial(0))
# for num in range(0,20):
#     print(calcFactorial(num))
    