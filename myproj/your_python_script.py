import pandas as pd
import sys

# Get the file path from command line arguments
file_path = sys.argv[1]

# Read the CSV file using pandas
data = pd.read_csv(file_path)

# Do some processing with the data (this is just a placeholder)
#processed_data = data.head()

# Print the processed data
print(len(data))
