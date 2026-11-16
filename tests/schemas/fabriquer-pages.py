from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, random
random.seed(3)
W,H=1200,1600
F=ImageFont.truetype("hand.ttf",44); T=ImageFont.truetype("hand.ttf",58)
def page(title, lines_before, img, lines_after, img_w, img_x):
    p=Image.new("RGB",(W,H),(246,244,236)); d=ImageDraw.Draw(p)
    for y in range(120,H,48): d.line([(0,y),(W,y)],fill=(170,195,225),width=2)
    d.line([(110,0),(110,H)],fill=(230,140,150),width=3)
    y=60; d.text((140,y),title,font=T,fill=(25,40,140)); y+=110
    for l in lines_before: d.text((140,y-34),l,font=F,fill=(30,30,60)); y+=48
    im=Image.open(img).convert("RGBA"); r=img_w/im.width; im=im.resize((img_w,int(im.height*r)))
    bg=Image.new("RGBA",im.size,(246,244,236,255)); bg.alpha_composite(im); im=bg.convert("RGB")
    y+=20; p.paste(im,(img_x,y)); box=[y,img_x,y+im.height,img_x+im.width]; y+=im.height+60
    y=((y-120)//48+1)*48+120
    for l in lines_after: d.text((140,y-34),l,font=F,fill=(30,30,60)); y+=48
    # légère rotation + flou comme une photo
    p=p.rotate(-1.5,resample=Image.BICUBIC,expand=False,fillcolor=(60,55,50)).filter(ImageFilter.GaussianBlur(0.6))
    return p, [round(box[0]/H*1000),round(box[1]/W*1000),round(box[2]/H*1000),round(box[3]/W*1000)]
p1,b1=page("Chapitre 3 : Le système nerveux",
  ["Le neurone est la cellule de base du système nerveux.","Il reçoit, traite et transmet le message nerveux.","Schéma du neurone (à savoir légender) :"],
  "neur.png",["Le message nerveux circule des dendrites vers","le corps cellulaire puis le long de l'axone.","Il passe au neurone suivant par une synapse."],980,110)
p2,b2=page("Chapitre 1 : La cellule",
  ["Tous les êtres vivants sont faits de cellules.","La cellule animale a une membrane, un cytoplasme","et un noyau qui contient l'ADN.","Schéma d'une cellule animale :"],
  "cell.png",["Les mitochondries produisent l'énergie de la cellule."],760,300)
p1.save("page1.jpg",quality=78); p2.save("page2.jpg",quality=78)
json.dump({"page1":b1,"page2":b2},open("truth.json","w")); print(b1,b2)
