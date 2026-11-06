#word embeddings lock in
import numpy as np
import pandas as pd
import csv
import wordsegment as ws
import re
import json 
import subprocess

#matrix of glove values
df = pd.read_csv('dolma_300_2024_1.2M.100_combined.txt', delimiter = ' ', quoting = 3 , skiprows = [597516, 597517, 181])
matrix = np.array(df)

#gloverlap is the clean list of overlapped glove words and ASLLEX words separated by comma
gloverlap = []
with open("output.txt", "r", encoding="utf-8") as file:
    reader = csv.reader(file)
    evil_broken_word = next(reader)
    rest_of_the_words_idk = next(reader)
for item in rest_of_the_words_idk:
        gloverlap = ",".join(rest_of_the_words_idk)
#rest_of_the_words_idk is the overlapping ALSLEX and GloVe words, 

#this is appends the wordembeddingsa to ALSLEX words
with open("gloverlap.txt", "r", encoding="utf-8") as file:
     for line in file: 
         for row in matrix:
              if isinstance(row[0], str):
                if (line.strip() == row[0].strip()):
                  print(row, end = " ")
                    #i then made this ouput: put.txt
                 
#this makes the data set groups where each word starts a new line
with open("put.txt", "r", encoding="utf-8") as file:
    mylines= file.readlines()
   # connects broken up lines
    mylines = ''.join(mylines)
    mylines = mylines.replace('\n', '')
    mylines = mylines.replace(']', '\n')
    mylines = mylines.replace('[', '')
    print(mylines)
    #this output becomes the finished glove text file
 
