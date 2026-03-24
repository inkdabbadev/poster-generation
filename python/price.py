from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pymongo import MongoClient
from datetime import datetime
import re
import time
from urllib.parse import quote_plus


# =========================
# CONFIG
# =========================

URL = "http://www.kjpl.in/"

username = "inkdabba_dev"
password = "Dev1234"

username = quote_plus(username)
password = quote_plus(password)

MONGO_URI = f"mongodb+srv://{username}:{password}@inkdabba.g1fmygf.mongodb.net/?appName=Inkdabba"

DB_NAME = "Posters"
COLLECTION_NAME = "Prices"


# =========================
# MongoDB
# =========================

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]


# =========================
# Selenium
# =========================

driver = webdriver.Chrome()
driver.get(URL)

wait = WebDriverWait(driver, 20)

time.sleep(2)

# close popup
try:
    close_btn = wait.until(
        EC.element_to_be_clickable((By.CLASS_NAME, "mfp-close"))
    )
    close_btn.click()
    print("Popup closed")
except:
    print("No popup")


# =========================
# Find tables
# =========================

tables = wait.until(
    EC.presence_of_all_elements_located((By.CLASS_NAME, "chennairate_table"))
)

gold_price = None
silver_price = None


# =========================
# Find correct table
# =========================

for table in tables:

    header = table.find_element(By.TAG_NAME, "thead").text

    if "MJDTA RATE (Without GST)" in header:

        rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")

        for row in rows:

            cols = row.find_elements(By.TAG_NAME, "td")

            if len(cols) == 2:

                label = cols[0].text.strip().upper()
                value = cols[1].text.strip()

                value = int(re.sub(r"[^\d]", "", value))

                if "GOLD" in label:
                    gold_price = value

                if "SILVER" in label:
                    silver_price = value


print("Gold:", gold_price)
print("Silver:", silver_price)


# =========================
# Save to MongoDB
# =========================

if gold_price and silver_price:

    last = collection.find_one(sort=[("updatedAt", -1)])

    if last and last["gold"] == gold_price and last["silver"] == silver_price:
        print("No price change")

    else:

        data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "gold": gold_price,
            "silver": silver_price,
            "updatedAt": datetime.utcnow()
        }

        collection.insert_one(data)

        print("New price stored")

else:
    print("Failed to extract price")


driver.quit()