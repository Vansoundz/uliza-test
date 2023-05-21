# Uliza raw files for testing
# ChatBot functions example using SPacy Entity Ruler pipeline and db training
import sqlite3, spacy
from spacy.pipeline import EntityRuler

#define entity variables
nlp = spacy.load("en_core_web_sm")
ruler = nlp.add_pipe('entity_ruler', before='ner')
app_name = "Uliza"
db = 'filamu.db'
prompt = "Ask me about movies."

class Actor():
	def __init__(self, name, questions):
		self.name = name.title()
		self.questions = questions
		self.origin = self.get_origin()
		self.roles = self.get_roles()
		self.answer = self.get_answers()

	def get_origin(self):
		origin = db_get_one("origin", "actor", "name", self.name)
		return origin

	def get_answers(self):
		ans = self.name + " is an actor "
		for question in self.questions:
			if question == "who" or question == "where":
				ans = ans + "from " + self.origin
			elif question == "which":
				ans = ans +  "who played " + join_list_items(self.roles)
		ans = ans + "."
		return ans

	def get_roles(self):
		cast = []
		actor_id = db_get_one("actor_id", "actor", "name", self.name)
		roles = db_get_all("role_name", "roles", "actor_id", str(actor_id))
		movie_ids = db_get_all("film_id", "roles", "actor_id", str(actor_id))
		for role, m_id in zip(roles, movie_ids):
			movie = db_get_one("title", "film", "film_id", str(m_id))
			cast.append(role + " in " + movie)
		return cast

class Role():
	def __init__(self, role, questions):
		self.role = role.title()
		self.questions = questions
		self.answer = self.get_answers()

	def get_answers(self):
		actor_id = db_get_one("actor_id", "roles", "role_name", self.role)
		actor = db_get_one("name", "actor", "actor_id", str(actor_id))
		film_id = db_get_one("film_id", "roles", "role_name", self.role)
		movie = db_get_one("title", "film", "film_id", str(film_id))
		ans = self.role + " was played by " + actor + " in the movie " + movie +"."
		return ans

class Movie():
	def __init__(self, title, questions):
		self.title = title.title()
		self.questions = questions
		self.description = self.get_desc()
		self.details = self.get_details()
		self.actors = self.get_actors()
		self.answer = self.get_answers()

	def get_desc(self):
		description = db_get_one("description", "film", "title", self.title)
		return " It " +description

	def get_details(self):
		release_year = db_get_one("release_year", "film", "title", self.title)
		country = db_get_one("country", "film", "title", self.title)
		category = db_get_one("category", "film", "title", self.title)
		producer = db_get_one("producer", "film", "title", self.title)
		return " is a " + str(release_year) + " " + country + " " + category + " movie by " + producer

	def get_actors(self):
		film_id = db_get_one("film_id", "film", "title", self.title)
		actor_ids = db_get_all("actor_id, role_name", "roles", "film_id", str(film_id))
		actors = [(db_get_one("name", "actor", "actor_id", str(data))) for data in actor_ids]
		return actors

	def get_answers(self):
		ans = self.title + self.details +"."
		for question in self.questions:
			if question == "who":
				ans = ans + " It features " + join_list_items(self.actors) +"."
			elif question == "what":
				ans =  ans + self.description
		return ans

def join_list_items(my_list):
	last = my_list.pop()
	first = ', '.join([str(elem) for elem in my_list])
	sentense = first + " and " + last
	return sentense

def db_get_one(field, table, condition=None, filter=None):
	sql = "SELECT " +field+ " FROM " +table
	if condition: sql = sql + " WHERE " +condition+ " == '" +filter+ "'"
	return conn.execute(sql).fetchone()[0]

def db_get_all(field, table, condition=None, filter=None):
	sql = "SELECT " +field+ " FROM " +table
	if condition: sql = sql + " WHERE " +condition+ " == '" +filter+ "'"
	return [(data[0]) for data in (conn.execute(sql).fetchall())]

def train_patterns(): #this should read from config file
	actor_list = db_get_all("name", "actor")
	role_list = db_get_all("role_name", "roles")
	movie_list = db_get_all("title", "film")
	pronoun_list = ("he", "she", "them", "it")
	qn_list = ("who", "where", "which", "what")

	entity_list = {"actor": actor_list, "role": role_list, "movie": movie_list, "pronoun": pronoun_list, "question": qn_list}
	for entity in entity_list:
		ruler.add_patterns([({"label": entity.upper(), "pattern": data.lower()}) for data in entity_list[entity]])

def check_patterns(text, its_list): # #this is not generic
	options = []
	doc = nlp(text.lower())
	actors = [(ent.text) for ent in doc.ents if ent.label_ == "actor".upper()]
	roles = [(ent.text) for ent in doc.ents if ent.label_ == "role".upper()]
	movies = [(ent.text) for ent in doc.ents if ent.label_ == "movie".upper()]
	pronouns = [(ent.text) for ent in doc.ents if ent.label_ == "pronoun".upper()]
	questions = [(ent.text) for ent in doc.ents if ent.label_ == "question".upper()]
	
	if "it" in pronouns and its_list["movie"] != "":
		movies.append(its_list["movie"])
	elif ("he" in pronouns or "she" in pronouns) and its_list["actor"] != "":
		actors.append(its_list["actor"])

	for it in its_list: its_list[it] = ""

	if not movies and not roles and not actors:
		options.append("I am not sure what you are looking for!")
	else:
		for actor in actors:
			a = Actor(actor, questions)
			options.append(a.answer)
			its_list["actor"] = actor
		for role in roles:
			r = Role(role, questions)
			options.append(r.answer)
		for movie in movies:
			m = Movie(movie, questions)
			options.append(m.answer)
			its_list["movie"] = movie
	return options, its_list

def chat(options, username):
	for data in options:
		print(app_name +": "+ data)
	print()
	return input(username +": ").title()

def ask(): #this is generic
	options = []
	text = ""
	its_list = {'actor': "", 'role': "", 'movie': ""}
	# user = chat(["Hello user, whats your name?"], "User")
	print("\nUliza: Hello " + "user.title()" + "!")
	while(text.lower() != "quit"):
		text = chat(options, "user")
		print(text)
		options, its_list = check_patterns(text, its_list)
	print("\n" +app_name+ ": Goodbye " + "user" + "!")

conn = sqlite3.connect(db)
train_patterns()
# nlp.to_disk("saved_nlp")
# nlp.from_disk("saved_nlp")
ask()