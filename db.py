import peewee

database = peewee.SqliteDatabase("vinmonopolet.db")


class Date(peewee.Model):
    date_id = peewee.DateField(unique=True)

    class Meta:
        database = database

class ItemsData(peewee.Model):
    date = peewee.ForeignKeyField(Date)
    varenummer = peewee.IntegerField()
    varenavn = peewee.CharField()
    volum = peewee.DoubleField()
    pris = peewee.DoubleField()
    literpris = peewee.DoubleField()
    land = peewee.CharField()
    alkohol = peewee.DoubleField()
    vareurl = peewee.CharField()
    varetype = peewee.CharField()

    class Meta:
        database = database
