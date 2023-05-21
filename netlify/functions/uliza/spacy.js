const spacy = require("spacy-js");
const sqlite3 = require("sqlite3").verbose();

// Uliza raw files for testing
// ChatBot functions example using spaCy Entity Ruler pipeline and db training

// Define entity variables
const app_name = "Uliza";
const db = "filamu.db";
const prompt = "Ask me about movies.";

class Actor {
  constructor(name, questions) {
    this.name = name.charAt(0).toUpperCase() + name.slice(1);
    this.questions = questions;
    this.origin = this.get_origin();
    this.roles = this.get_roles();
    this.answer = this.get_answers();
  }

  get_origin() {
    const origin = db_get_one("origin", "actor", "name", this.name);
    return origin;
  }

  get_answers() {
    let ans = this.name + " is an actor ";
    for (const question of this.questions) {
      if (question === "who" || question === "where") {
        ans += "from " + this.origin;
      } else if (question === "which") {
        ans += "who played " + join_list_items(this.roles);
      }
    }
    ans += ".";
    return ans;
  }

  get_roles() {
    const cast = [];
    const actor_id = db_get_one("actor_id", "actor", "name", this.name);
    const roles = db_get_all(
      "role_name",
      "roles",
      "actor_id",
      actor_id.toString()
    );
    const movie_ids = db_get_all(
      "film_id",
      "roles",
      "actor_id",
      actor_id.toString()
    );
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const m_id = movie_ids[i];
      const movie = db_get_one("title", "film", "film_id", m_id.toString());
      cast.push(role + " in " + movie);
    }
    return cast;
  }
}

class Role {
  constructor(role, questions) {
    this.role = role.charAt(0).toUpperCase() + role.slice(1);
    this.questions = questions;
    this.answer = this.get_answers();
  }

  get_answers() {
    const actor_id = db_get_one("actor_id", "roles", "role_name", this.role);
    const actor = db_get_one("name", "actor", "actor_id", actor_id.toString());
    const film_id = db_get_one("film_id", "roles", "role_name", this.role);
    const movie = db_get_one("title", "film", "film_id", film_id.toString());
    const ans =
      this.role + " was played by " + actor + " in the movie " + movie + ".";
    return ans;
  }
}

class Movie {
  constructor(title, questions) {
    this.title = title.charAt(0).toUpperCase() + title.slice(1);
    this.questions = questions;
    this.description = this.get_desc();
    this.details = this.get_details();
    this.actors = this.get_actors();
    this.answer = this.get_answers();
  }

  get_desc() {
    const description = db_get_one("description", "film", "title", this.title);
    return " It " + description;
  }

  get_details() {
    const release_year = db_get_one(
      "release_year",
      "film",
      "title",
      this.title
    );
    const country = db_get_one("country", "film", "title", this.title);
    const category = db_get_one("category", "film", "title", this.title);
    const producer = db_get_one("producer", "film", "title", this.title);
    return (
      " is a " +
      release_year.toString() +
      " " +
      country +
      " " +
      category +
      " movie by " +
      producer
    );
  }

  get_actors() {
    const film_id = db_get_one("film_id", "film", "title", this.title);
    const actor_ids = db_get_all(
      "actor_id, role_name",
      "roles",
      "film_id",
      film_id.toString()
    );
    const actors = actor_ids.map((data) =>
      db_get_one("name", "actor", "actor_id", data[0].toString())
    );
    return actors;
  }

  get_answers() {
    let ans = this.title + this.details + ".";
    for (const question of this.questions) {
      if (question === "who") {
        ans += " It features " + join_list_items(this.actors) + ".";
      } else if (question === "what") {
        ans += this.description;
      }
    }
    return ans;
  }
}

function join_list_items(my_list) {
  const last = my_list.pop();
  const first = my_list.join(", ");
  const sentence = first + " and " + last;
  return sentence;
}

function db_get_one(field, table, condition = null, filter = null) {
  let sql = `SELECT ${field} FROM ${table}`;
  if (condition) sql += `WHERE ${condition} == '${filter}'`;
  return conn.exec(sql)[0][0];
}

function db_get_all(field, table, condition = null, filter = null) {
  let sql = `SELECT ${field} FROM ${table}`;
  if (condition) sql += `WHERE ${condition} == '${filter}'`;
  return conn.exec(sql).map((data) => data[0]);
}

function train_patterns() {
  const actor_list = db_get_all("name", "actor");
  const role_list = db_get_all("role_name", "roles");
  const movie_list = db_get_all("title", "film");
  const pronoun_list = ["he", "she", "them", "it"];
  const qn_list = ["who", "where", "which", "what"];

  const entity_list = {
    actor: actor_list,
    role: role_list,
    movie: movie_list,
    pronoun: pronoun_list,
    question: qn_list,
  };

  for (const entity in entity_list) {
    ruler.addPatterns(
      entity_list[entity].map((data) => ({
        label: entity.toUpperCase(),
        pattern: data.toLowerCase(),
      }))
    );
  }
}

function check_patterns(text, its_list) {
  const options = [];
  const doc = nlp(text.toLowerCase());
  const actors = doc.ents
    .filter((ent) => ent.label_ === "ACTOR")
    .map((ent) => ent.text);
  const roles = doc.ents
    .filter((ent) => ent.label_ === "ROLE")
    .map((ent) => ent.text);
  const movies = doc.ents
    .filter((ent) => ent.label_ === "MOVIE")
    .map((ent) => ent.text);
  const pronouns = doc.ents
    .filter((ent) => ent.label_ === "PRONOUN")
    .map((ent) => ent.text);
  const questions = doc.ents
    .filter((ent) => ent.label_ === "QUESTION")
    .map((ent) => ent.text);

  if (pronouns.includes("it") && its_list.movie !== "") {
    movies.push(its_list.movie);
  } else if (
    (pronouns.includes("he") || pronouns.includes("she")) &&
    its_list.actor !== ""
  ) {
    actors.push(its_list.actor);
  }

  if (actors.length > 0 && roles.length > 0) {
    for (const actor of actors) {
      for (const role of roles) {
        options.push(new Role(role, questions));
      }
      options.push(new Actor(actor, questions));
    }
  } else if (movies.length > 0) {
    for (const movie of movies) {
      options.push(new Movie(movie, questions));
    }
  } else if (actors.length > 0) {
    for (const actor of actors) {
      options.push(new Actor(actor, questions));
    }
  }

  if (options.length === 0) {
    options.push({ answer: "I'm sorry, I couldn't understand your query." });
  }

  return options;
}

spacy.load("en_core_web_sm", (nlp) => {
  const conn = new sqlite3.Database(db);
  const ruler = nlp.addPipeline(nlp.Pipeline.entityRuler);

  // Train entity patterns
  train_patterns();

  // Initialize its_list
  const its_list = { actor: "", movie: "" };

  // Sample chat loop
  let user_input = prompt;
  while (user_input.toLowerCase() !== "quit") {
    const options = check_patterns(user_input, its_list);
    const response = options[Math.floor(Math.random() * options.length)].answer;
    console.log(response);

    // Update its_list
    its_list.actor = "";
    its_list.movie = "";

    // Check if the response contains any new entities
    if (response.includes("actor")) {
      const actor_entities = nlp(response)
        .ents.filter((ent) => ent.label_ === "ACTOR")
        .map((ent) => ent.text);
      if (actor_entities.length > 0) {
        its_list.actor = actor_entities[0];
      }
    } else if (response.includes("movie")) {
      const movie_entities = nlp(response)
        .ents.filter((ent) => ent.label_ === "MOVIE")
        .map((ent) => ent.text);
      if (movie_entities.length > 0) {
        its_list.movie = movie_entities[0];
      }
    }

    user_input = prompt;
  }

  // Close the database connection
  conn.close();
});