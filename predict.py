# Importing libraries
import sys
import json
import warnings
import numpy as np
import pandas as pd
from scipy.stats import mode
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# %matplotlib inline

# Reading the train.csv by removing the 
# last column since it's an empty column
# DATA_PATH = "disease_dataset.csv"
DATA_PATH = "Training.csv"
data = pd.read_csv(DATA_PATH).dropna(axis = 1)

# Checking whether the dataset is balanced or not
disease_counts = data["prognosis"].value_counts()
temp_df = pd.DataFrame({
	"Disease": disease_counts.index,
	"Counts": disease_counts.values
})

# Encoding the target value into numerical
# value using LabelEncoder
encoder = LabelEncoder()
data["prognosis"] = encoder.fit_transform(data["prognosis"])
X = data.iloc[:,:-1]
y = data.iloc[:, -1]
X_train, X_test, y_train, y_test =train_test_split(X, y, test_size = 0.2, random_state = 24)

# print(f"Train: {X_train.shape}, {y_train.shape}")
# print(f"Test: {X_test.shape}, {y_test.shape}")

# Defining scoring metric for k-fold cross validation
def cv_scoring(estimator, X, y):
	return accuracy_score(y, estimator.predict(X))

# Initializing Models
models = {
	"SVC":SVC(),
	"Gaussian NB":GaussianNB(),
	"Random Forest":RandomForestClassifier(random_state=18)
}

# Producing cross validation score for the models
for model_name in models:
	model = models[model_name]
	scores = cross_val_score(model, X, y, cv = 10, 
							n_jobs = -1, 
							scoring = cv_scoring)
	# print("=="*30)
	# print(model_name)
	# print(f"Scores: {scores}")
	# print(f"Mean Score: {np.mean(scores)}")


# Training and testing SVM Classifier
svm_model = SVC()
svm_model.fit(X_train, y_train)
preds = svm_model.predict(X_test)

# print(f"Accuracy on train data by SVM Classifier\
# : {accuracy_score(y_train, svm_model.predict(X_train))*100}")

# print(f"Accuracy on test data by SVM Classifier\
# : {accuracy_score(y_test, preds)*100}")

# Training and testing Naive Bayes Classifier
nb_model = GaussianNB()
nb_model.fit(X_train, y_train)
preds = nb_model.predict(X_test)
# print(f"Accuracy on train data by Naive Bayes Classifier\
# : {accuracy_score(y_train, nb_model.predict(X_train))*100}")

# print(f"Accuracy on test data by Naive Bayes Classifier\
# : {accuracy_score(y_test, preds)*100}")

# Training and testing Random Forest Classifier
rf_model = RandomForestClassifier(random_state=18)
rf_model.fit(X_train, y_train)
preds = rf_model.predict(X_test)
# print(f"Accuracy on train data by Random Forest Classifier\
# : {accuracy_score(y_train, rf_model.predict(X_train))*100}")

# print(f"Accuracy on test data by Random Forest Classifier\
# : {accuracy_score(y_test, preds)*100}")

# Training the models on whole data
from statistics import mode

final_svm_model = SVC()
final_nb_model = GaussianNB()
final_rf_model = RandomForestClassifier(random_state=18)
final_svm_model.fit(X, y)
final_nb_model.fit(X, y)
final_rf_model.fit(X, y)

# Reading the test data
test_data = pd.read_csv("Testing.csv").dropna(axis=1)

# Handling unseen labels in the test data
# Ensure all labels in `test_data` are included in the encoder's classes
new_labels = set(test_data.iloc[:, -1]) - set(encoder.classes_)
if new_labels:
    encoder.classes_ = np.concatenate([encoder.classes_, list(new_labels)])

# Transform the test labels
test_X = test_data.iloc[:, :-1]
test_Y = encoder.transform(test_data.iloc[:, -1])

# Making prediction by taking the mode of predictions 
# made by all the classifiers
svm_preds = final_svm_model.predict(test_X)
nb_preds = final_nb_model.predict(test_X)
rf_preds = final_rf_model.predict(test_X)

# Handle the case where mode returns multiple values
final_preds = [mode([i, j, k]) if len(set([i, j, k])) > 1 else i for i, j, k in zip(svm_preds, nb_preds, rf_preds)]

# print(f"Accuracy on Test dataset by the combined model: {accuracy_score(test_Y, final_preds) * 100}")

# Dynamically extracting symptoms from the data columns
symptoms = X.columns.values

# Creating a symptom index dictionary to encode the input symptoms into numerical form
symptom_index = {}
for index, value in enumerate(symptoms):
    symptom = " ".join([i.capitalize() for i in value.split("_")])
    symptom_index[symptom] = index

# Update the data_dict to reflect the new symptom_index
data_dict = {
    "symptom_index": symptom_index,
    "predictions_classes": encoder.classes_
}

# Defining the Function
# Input: string containing symptoms separated by commas
# Output: Generated predictions by models
unmatched_symptoms = [] # in case any symptom does not match
def predictDisease(symptoms):
		unmatched_symptoms = []  # Clear unmatched symptoms for each call
		warning_msg = None  # Initialize warning message

		symptoms = symptoms.split(",")
		# Normalize input symptoms to match the format in `symptom_index`
		symptoms = [" ".join([word.capitalize() for word in symptom.strip().split(" ")]) for symptom in symptoms]

		# Creating input data for the models
		input_data = [0] * len(data_dict["symptom_index"])
		for symptom in symptoms:
			if symptom in data_dict["symptom_index"]:
				index = data_dict["symptom_index"][symptom]
				input_data[index] = 1
			else:
				# print(f"Warning: Symptom '{symptom}' not found in the dataset and will be ignored.")
				# warning = f"Symptom '{symptom}' not found in the dataset and will be ignored."
				unmatched_symptoms.append(symptom)

		input_data = np.array(input_data).reshape(1,-1)
		
		# generating individual outputs
		rf_prediction = data_dict["predictions_classes"][final_rf_model.predict(input_data)[0]]
		nb_prediction = data_dict["predictions_classes"][final_nb_model.predict(input_data)[0]]
		svm_prediction = data_dict["predictions_classes"][final_svm_model.predict(input_data)[0]]
		final_prediction = ([rf_prediction, nb_prediction, svm_prediction])[0]
		
		if unmatched_symptoms:
			warning_msg = f"Symptoms: {', '.join(unmatched_symptoms)} are not found in the dataset and will be ignored."
		return {
			"rf_model_prediction": rf_prediction,
			"naive_bayes_prediction": nb_prediction,
			"svm_model_prediction": svm_prediction,
			"final_prediction":final_prediction,
			"warning": warning_msg
		}

import warnings

# Ignoring the specific warning
warnings.filterwarnings("ignore", message="X does not have valid feature names", category=UserWarning)

sys.stdout.flush() # Flushing all the logs in the previous code
print(json.dumps({"models_trained": True}))
sys.stdout.flush() # Flushing the completion message

# print(symptoms)
# sys.stdout.flush()

# function to output the symptom list
def getSymptomsList():
	strSymptoms = ",".join(map(str, symptoms.flatten()))
	strSymptoms = strSymptoms.split(",")
	# Normalize input symptoms to match the format in `symptom_index`
	strSymptoms = [" ".join([word.capitalize() for word in symptom.strip().split("_")]) for symptom in strSymptoms]

	print(strSymptoms)
	sys.stdout.flush()

# Listning to the server's response
# input: symptoms
# output: predicted disease
for line in sys.stdin:
	try:
		user_input = line.strip()

		if(user_input == "get"):
			getSymptomsList()
			continue

		result = predictDisease(user_input)
		
		response = {
			"prediction": result['final_prediction'], 
			"warning": result["warning"]
		}
		
		print(json.dumps(response))
		sys.stdout.flush()

	except Exception as e:
		error_response = {'error': str(e)}
		print(json.dumps(error_response))
		sys.stderr.flush()

print("script ended!")