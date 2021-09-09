import sys

def anagramCount(word):
    anagram_dict = {}
    anagram_len = len(word)
    for char in word:
        if char in anagram_dict.keys():
            anagram_dict[char] += 1
        else:
            anagram_dict[char] = 1

    count = calcFactorial(anagram_len)

    for key, val in anagram_dict.items():
        count = count / calcFactorial(val)
    
    return count

def calcFactorial(x):
    factorial = 1
    while (x>0):
        factorial = x * factorial
        x -= 1
    return factorial

def main():
    inputs = sys.argv
    if len(inputs) < 2:
        sys.stdout.write('EMPTY\n')
        exit(1)
    anagram = inputs[1]
    if len(anagram) == 0:
        sys.stdout.write('EMPTY\n')
    elif anagram.isalpha():
        num_anagrams = int(anagramCount(anagram))
        sys.stdout.write('%s\n'%num_anagrams)
    else:
        sys.stderr.write('INVALID\n')

if __name__ =="__main__":
    main()
