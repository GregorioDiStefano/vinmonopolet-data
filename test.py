import codecs
import db
import logging
import sys
import re

logger = logging.getLogger('peewee')
logger.setLevel(logging.CRITICAL)
logger.addHandler(logging.StreamHandler())


def add_date():
    db.Date(date_id="%s-%s-%s" % (year, month, day)).save()

def add_items(items):
        date = db.Date.get(date_id="%s-%s-%s" % (year, month, day))
        with db.database.atomic():
            for item in items:
                db.ItemsData(date=date,**item).save()

columns = ['Varenummer', 'Varenavn', 'Varetype', 'Volum', 'Pris', 'Literpris', 'Land', 'Alkohol', 'Vareurl']
columns_tuple = []

with codecs.open(sys.argv[1],'r',encoding='utf8') as f:
    text = f.readlines()
    date_str = re.findall("(\d\d\d\d)(\d\d)(\d\d)", sys.argv[1])
    year, month, day = date_str[0][0], date_str[0][1], date_str[0][2]
    add_date()

header = text[0]
body = text[1:]

for c in columns:
    if c not in header:
        raise Exception("Header does not contain columns")

for c in columns:
    idx = [x.strip() for x in header.split(';')].index(c)
    columns_tuple.append((c, idx))

insert_data = []
for l in body:
    line_seperated = [x.strip() for x in l.split(';')]
    insert_dict = {}
    for name, idx in columns_tuple:
        if line_seperated[idx].isdigit():
            insert_dict[name.lower()] = int(line_seperated[idx])
        elif line_seperated[idx].replace(",", "").isdigit():
            insert_dict[name.lower()] = float(line_seperated[idx].replace(',', '.'))
        else:
            insert_dict[name.lower()] = line_seperated[idx].encode("utf-8")
    insert_data.append(insert_dict)
add_items(insert_data)
