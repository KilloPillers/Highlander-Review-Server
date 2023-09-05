# when dokcerizing remember to install python and its dependancies
# for this script
from pymongo import MongoClient # pip3 install pymongo
from gridfs import GridFS
import gspread  # pip3 install gspread
from oauth2client.service_account import ServiceAccountCredentials
# pip3 install oath2client
import csv
import json
import os
import zlib
import datetime

def insert_review(review):
    review["additional_comments"] = review["additional_comments"].strip('"')
    review["difficulty"] = int(review["difficulty"])
    review["like"] = 0
    review["dislike"] = 0
    #convert date from MM/DD/YYYY to YYYY/MM/DD
    review["date"] = datetime.datetime.strptime(review["date"], "%m/%d/%Y").strftime("%Y/%m/%d")
    query = {"class_name": review["class_name"],
             "difficulty": int(review["difficulty"]),
             "additional_comments": review["additional_comments"]}
    #check to see if review already exists
    if review_collection.find_one(query):
        print("But review already exists in MongoDB")
        return
    result = review_collection.insert_one(review)
    course = course_collection.find_one({"class_name": review["class_name"]})
    avg_difficulty = round(float(course["average_diff"]), 2)
    num_reviews = int(course["number_of_reviews"])
    new_avg_difficulty = (avg_difficulty * num_reviews + int(review["difficulty"])) / (num_reviews + 1)
    course_collection.update_one({"class_name": review["class_name"]},
                                 {"$inc": {"number_of_reviews": 1},
                                  "$set": {"average_diff": new_avg_difficulty}
                                  })

def download_new_sheet():
    scope = ['https://spreadsheets.google.com/feeds',
             'https://www.googleapis.com/auth/drive']
    
    if os.path.exists('./credentials.json'):
      credentials = ServiceAccountCredentials.from_json_keyfile_name(
            './credentials.json', scope)
    else:
      # Retrieve the serialized credentials from the Heroku config var
      serialized_credentials = os.environ.get('GOOGLE_CREDENTIALS')

      # Deserialize the JSON data into a Python dictionary
      credentials_data = json.loads(serialized_credentials)
      credentials = ServiceAccountCredentials.from_json_keyfile_dict(credentials_data, scope)
      
    client = gspread.authorize(credentials)
     
    # Official UCR Class Difficulty Spreadsheet
    spreadsheet = client.open_by_url(
            'https://docs.google.com/spreadsheets/d/1qiy_Oi8aFiPmL4QSTR3zHe74kmvc6e_159L1mAUUlU0/edit#gid=0')
    # Test Spreadsheet
    #spreadsheet = client.open_by_url(
    #        'https://docs.google.com/spreadsheets/d/1ocQTvVgAA3MPMVLUkjZ8-PUX9LMGoO5ebA8A-NurO7w/edit?usp=sharing')

    worksheet = spreadsheet.worksheet('Sheet1')

    data = worksheet.get_all_values()

    tsv_file_path = './new.tsv'

    with open(tsv_file_path, 'w', newline='') as tsv_file:
        tsv_writer = csv.writer(tsv_file, delimiter='\t')
        tsv_writer.writerows(data)
    print("Downloaded new.tsv from UCR Class Difficulty Spreadsheet")


def compare_files():
    new_sheet_path = './new.tsv'
    fs = GridFS(db, collection='sysfiles')
    compressed_file = fs.find_one({'filename': 'old.gz'})
    old_sheet = zlib.decompress(compressed_file.read())
    old_sheet = old_sheet.decode('utf-8')
    needs_update = False
    try:
        with open(new_sheet_path, 'r') as new_sheet:
            old_lines = [line.rstrip('\n') for line in old_sheet.splitlines()]
            new_lines = [line.rstrip('\n') for line in new_sheet.readlines()]
            i = 2
            j = 2
            current_course = 'START'
            # find the difference between the old and new file
            while i < len(old_lines) and j < len(new_lines):
                new_line_data = new_lines[j].split('\t')
                if new_line_data[0] != '':
                    current_course = new_line_data[0]
                if (old_lines[i] != new_lines[j]):
                    new_review = {"class_name": current_course,
                                  "additional_comments": new_line_data[2],
                                  "difficulty": new_line_data[3],
                                  "date": new_line_data[4],
                                  "like": 0,
                                  "dislike": 0
                                  }
                    print("New review found:", new_review)
                    insert_review(new_review)
                    needs_update = True
                    j += 1
                else:
                    j += 1
                    i += 1
            # everything else is new by the pidgeonhole principle
            for new_line in new_lines[j:]:
                if new_line != '':
                    current_course = new_line[0]
                new_line_data = new_line.split('\t')
                new_review = {"class_name": current_course,
                              "additional_comments": new_line_data[2],
                              "difficulty": new_line_data[3],
                              "date": new_line_data[4],
                              "like": 0,
                              "dislike": 0
                              }
                print("New review found:", new_review)
                insert_review(new_review)
                needs_update = True

    except FileNotFoundError as error:
        print("File not found.", error)
    except IOError as error:
        print("An error occurred while reading the file.", error)

    print("Finished comparing files")

    file_path = "new.tsv"
    compressed_file_path = "old.gz"

    # Compress the file using zlib
    with open(file_path, "rb") as source_file, open(compressed_file_path, "wb") as compressed_file:
        data = source_file.read()
        compressed_data = zlib.compress(data, level=zlib.Z_BEST_COMPRESSION)
        compressed_file.write(compressed_data)
    
    if needs_update:
        print("Updating old file in MongoDB")
        # Delete the old file from GridFS if it exists
        old_file = fs.find_one({"filename": "old.gz"})
        if old_file:
            fs.delete(old_file._id)

        # Store the compressed file in MongoDB
        with open(compressed_file_path, "rb") as file:
            file_id = fs.put(file, filename="old.gz", contentType="application/gzip")

        print("Compressed file stored with ID:", file_id)
    else:
        print("No new reviews found. Old file in MongoDB is up to date")
    # Clean up: You can delete the compressed file if you no longer need it locally.
    os.remove(compressed_file_path)
    os.remove(file_path)


if __name__ == "__main__":
    if os.path.exists('./config.json'):
        with open("./config.json") as config_file:
            config = json.load(config_file)
            URI = config["URI"]
    else:
        URI = os.environ.get("URI")
    client = MongoClient(URI)
    db = client['UCR']
    review_collection = db['reviews']
    course_collection = db['courses']
    download_new_sheet()
    compare_files()
    print("Script has finished succesfully")
