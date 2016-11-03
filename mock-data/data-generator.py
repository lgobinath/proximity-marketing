import json
import random
import time
from random import randint

floors = [1, 2, 3]
items = ['Automotive', 'Baby', 'Beauty', 'Books', 'Beer', 'Clothing', 'Computers', 'Electronics', 'Fancy', 'Games', 'Garden', 'Grocery', 'Health', 'Home', 'Industrial', 'Jewelery', 'Kids', 'Movies', 'Music', 'Cooking', 'Shoes', 'Sports', 'Snacks', 'Tools', 'Toys']

def writePersonLocation(csvFile, id, timestamp):
	floor = randint(1, 3)
	shelfNumber = randint(1, 224)
	csvFile.write('{},{},{},{}\n'.format(id, timestamp, floor, shelfNumber))


print("Generating item_data.csv")
print("Generating coupon_data.csv")

with open ('item_data.csv', 'w') as csvFile:
	for floorNumber in floors:
		with open('floor/floor_' + str(floorNumber) + '.json') as data_file:    
			data = json.load(data_file)
		map = data['map']
		for x in xrange(0,15):
			for y in xrange(0,15):
				if map[x][y] == 1:
					shelfNumber = x * 15 + y
					region = (int(x / 3) * 5) + int(y / 3)
					item = items[region % len(items)];
					itemId = item.lower() + "-" + str(floorNumber) + "_" + str(shelfNumber)
					category = item
					offerId = 'N/A'

					if(bool(random.getrandbits(1))) :
						offerId = 'offer-' + str(randint(2, 85))

					csvFile.write('{},{},{},{},{},{}\n'.format(itemId, item, category, floorNumber, shelfNumber, offerId))

					# Create coupon
					if(bool(random.getrandbits(1))) :
						couponId = itemId
						couponName = 'Coupon for ' + item
						description = "For your next purchase of " + item + " you have 10% discount"
						expirationDate = 2551001197000
						minPurchase = 5000.00
						with open ('coupon_data.csv', 'a') as couponFile:
							couponFile.write('{},{},{},{},{},{}\n'.format(couponId, couponName, description, expirationDate, itemId, minPurchase))

print("Generating offer_data.csv")

with open ('offer_data.csv', 'w') as csvFile:
	for discount in xrange(2, 86):
		offerId = 'offer-' + str(discount)
		name = str(discount) + "% Discount"
		description = "Get " + str(discount) + "% discount for every 5"
		expirationDate = 2551001197000

		csvFile.write('{},{},{},{}\n'.format(offerId, name, description, expirationDate))

print("Generating location_data.csv")

with open ('location_data.csv', 'w') as csvFile:
	timestamp = int(round(time.time() * 1000))
	for t in xrange(timestamp, timestamp + 172800000, 60000):
		for id in xrange(0, 25):
			writePersonLocation(csvFile, 'staff-' + str(id), t)
		
		for id in xrange(0, 100):
			writePersonLocation(csvFile, 'customer-' + str(id), t)

print("Finished")