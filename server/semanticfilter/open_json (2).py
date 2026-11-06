import json
import wordsegment as ws
ws.load()

with open('label_map.json', 'r') as file:   
      label_map = json.load(file) 

asl_lex =label_map.values()

alphabet = "abcdefghijklmnopqrstuvwxyz"
nums = "0123456789!?"
symbols = "!@#$%^&*()-_+=[]|</?,.\\"

asl_content_words = []
for gloss in asl_lex:
     if gloss[-1] not in nums:
        asl_content_words.append(gloss)

asl_content_words.append("covid19")
asl_content_words.append("f1")
asl_content_words.append("co2")
asl_content_words.append("o2")
asl_content_words.append("world war 2")
asl_content_words.append("cl:3")
asl_content_words.append("starcl:5")
asl_content_words.append("call911")
asl_content_words.append("age5-6")


ws.load()
segmented_asl_content_words = []
for val in asl_content_words:
    words = ws.segment(val)
    segmented_asl_content_words.append(" ".join(words))

with open('segmented_asl_content.txt', 'w', encoding = 'utf-8') as file:
    file.write(', '.join(str(item) for item in segmented_asl_content_words))

with open('asl_content.txt', 'w', encoding = 'utf-8') as file:
    file.write(', '.join(str(item) for item in asl_content_words))
#asl_content includes the sign "release, rescue" which segments to "release rescue" and creates an extra term when bert tries to analyze it + errors. I deleted it from the bert_representations.txt file.