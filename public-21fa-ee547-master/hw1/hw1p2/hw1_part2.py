import http.server
from urllib.parse import parse_qs
import json
import datetime
import os
import itertools

num_requests = 0
num_errs = 0

class HTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global num_requests
        global num_errs
        if self.path == "/favicon.ico":
            return
        num_requests += 1
        if self.path == "/ping":
            self.send_response(204)
            self.end_headers()
            self.wfile.write(b'')

        elif self.path == "/status":
            self.send_response(200)
            self.end_headers()
            response_dict = {"time": str(datetime.datetime.now()),"req": num_requests, "err": num_errs}
            self.wfile.write(json.dumps(response_dict, indent = 4).encode())
        
        elif "/shuffle?" in self.path:
            path, _, query = self.path.partition("?")
            query_dict = parse_qs(query)
            if "p" not in query_dict.keys(): #empty string
                self.send_response(400)
                num_errs += 1
                self.end_headers()
                self.wfile.write(b'')
            else:
                anagram_string = query_dict["p"][0]

                if anagram_string.isalpha():    # valid string
                    self.send_response(200)
                    self.end_headers()
                    
                    response_dict = {"p": anagram_string}
                    response_dict["total"] = str(anagramCount(anagram_string))
                    response_dict["page"] = []
    
                    if "limit" in query_dict.keys():
                        if int(query_dict["limit"][0]) > 25:
                            limit = 25
                        elif int(query_dict["limit"][0]) < 0:
                            limit = 0
                        else:
                            limit = int(query_dict["limit"][0])
                    else:
                        limit = 4

                    temp_list = anagrams(anagram_string, limit)
                    response_dict["page"] = temp_list
                    self.wfile.write(json.dumps(response_dict, indent = 4).encode())
                    
                else:   #invalid string
                    self.send_response(400)
                    num_errs += 1
                    self.end_headers()
                    self.wfile.write(b'')


        elif self.path == "/secret":
            if os.path.exists("/tmp/secret.key"):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(open("/tmp/secret.key", "r").read().encode())
            else:
                self.send_response(404)
                self.end_headers()
                num_errs += 1
            
        else:
            num_errs += 1
            self.send_response(404)
        
        

def anagrams(word, limit):
    word_sort = ''.join(sorted(word))
    word_grow = ""
    anagram_list = []
    for char in reversed(word_sort):
        word_grow += char
        perm_list = ["".join(perm) for perm in itertools.permutations(word_grow)]
        temp = set(perm_list)
        anagram_list = list(temp)
        sorted(anagram_list)
        if len(anagram_list) >= limit:
            break
    
    prefix = word_sort.replace(word_grow[::-1], '')
    return_list = []
    for i in range(limit):
        return_list.append(prefix + anagram_list[i])
    return sorted(return_list)


def anagramCount(word):
    letter_dict = {}
    anagram_len = len(word)
    for char in word:
        if char in letter_dict.keys():
            letter_dict[char] += 1
        else:
            letter_dict[char] = 1

    count = calcFactorial(anagram_len)

    for key, val in letter_dict.items():
        count //= calcFactorial(val)
    
    return int(count)

def calcFactorial(x):
    factorial = 1
    while (x>0):
        factorial = x * factorial
        x -= 1
    return factorial

def main():
    localhost = "localhost"
    port = 8088
    httpd = http.server.HTTPServer((localhost,port),HTTPRequestHandler)
    print("Started server at http:://{}:{}".format(localhost,port))

    try:
        httpd.serve_forever()
    except KetboardInterrupt:
        pass
    
    httpd.server_close()
    print("Server ended")

if __name__ == "__main__":
    main()
