# §7 TAKE OVER MY WORK 

Plateforme d'agents IA sécurisés qui apprennent, exécutent et vérifient votre travail 

« Your work. Your rules. Your agent. » 

Document : cahier des charges + architecture + trame de soutenance Statut : version a valider par l'équipe (3 personnes) 

###### Sommaire 

1. Vision et probleme 

2. Ce qui rend le projet différent 

3. Les trois modes 

4. Sécurité : Permission & Policy Engine 

5. Architecture technique 

6. Mémoire, outils, vérification, auto-correction 

7. DevSecOps 

8. Observabilité et self-healing 

9. Stack technique 

10. Répartition de I'equipe et structure GitHub 

11. Parcours utilisateur complet 

12. Public vs local, et cout 

13. Scénario de soutenance 

14. Intérét académique et pitch 

15. MVP proposé et points a valider 

#### 1. Vision et probléme 

Une personne ne manque pas d'information : elle manque de temps et de continuité. 

Profil Ce qu'il gére 

®@ Etudiant cours, PDF, deadlines, emails, projets, consignes, examens, taches 

& Professeur cours, programmes, exercices, examens, corrections, groupes, deadlines, emails 

@ Professionnel _ procédures, emails, documents, taches, projets, workflows, régles métier 

Les outils actuels savent analyser, resumer, générer et conseiller. Notre concept va plus loin : 

« Donne-moi ton environnement de travail. Apprends comment il fonctionne. Donne-moi une tdache. Je vais la planifier, l'exécuter, vérifier le résultat et te demander ton autorisation lorsque nécessaire. » 

L'objectif n'est pas de créer un chatbot. Le produit est un agent IA qui prend en charge de vraies taches, dans le respect des permissions de l'utilisateur. avec vérification de ses actions et validation humaine pour 

les actions sensibles. Le méme produit sert trois profils : Student, Professor, Professional. 

2. Ce qui rend le projet différent : la boucle agentique 



<!-- Start of picture text -->
USER ENVIRONMENT + @ UNDERSTAND > € LEARN > ©) REMEMBER<br>> @ ReceIVE TASK > LY PLAN > AcT + Q& VERIFY<br>|<br>———M@Mt_<br>SUCCESS FAILURE<br>| |<br>DONE ADAPT / RETRY<br>impossible ?<br>|<br>& HUMAN<br><!-- End of picture text -->

C'est cette boucle qui transforme un chatbot en agent. 

3. Les trois modes 

## ® Mode1:Take Over My Study 

Entrées : emploi du temps, syllabus, cours PDF, consignes, projets, deadlines, emails, résultats, dépdot GitHub. Représentation construite : 

Course + Topics, Deadlines, Requirements, Resources Project > Tasks, Repository, Tests, Status 

Exemple. L'étudiant demande « What do | need to do today? ». L'agent ne répond pas « fais ton TP » mais produit : 

@ Devops TP - Deadline : demain — Avancement : 60 % Vv Read requirements J Create Dockerfile > Run tests > Fix failing test > Submit PDF 

Il peut ensuite exécuter certaines actions autorisées. 

### &3 Mode 2 : Take Over My Teaching 

Entrées : syllabus, cours, calendrier, TD/TP, examens, exercices, corrigés, barémes, groupes. Compréhension : cours — sujets déja enseignés — sujets restants > exercices > évaluation. Exemple. « Prépare le prochain TD de Kafka a partir de ce qui a déja été enseigné. » L'agent: 

1. analyse les cours réalisés; 2. identifie les concepts étudiés ; 3. détermine le niveau attendu ; 4. prépare les exercices ; 5. prépare un corrigé ; 6. génére les documents ; 7. propose le contenu au professeur. Avant toute action sensible : Q Human approval required. 

### (® Mode3 : Take Over My Work 

Version la plus proche du concept original. Le professionnel fournit procédures, documents, régles, historique, taches, emails, workflow. L'agent apprend « comment cette personne travaille-t-elle ? », puis on lui délégue des taches. Exemple : « Prepare the weekly project status. » 

READ + comprendre le contexte projet + vérifier taches récentes > vérifier statut Llina dncumante nantinante . DIAM \ méndénan Ta etatik © VEDTEV \ nndnanan Ta aannant 

Fare UURUMEHES por Ganenes + run + generer aS Qk@uue + vENgr r+ preparer ac rappure 

## 4. & Coeur sécurité : Permission & Policy Engine 

On donne a une IA la capacité d'agir; la question centrale est : que peut-elle faire ? 

Niveau Comportement Exemples 

@ ALLOW L'agent agit créer une tache, lire un document projet, générer un directement rapport, lancer les tests, mettre a jour un statut interne @ HUMAN L'agent prépare, envoyer un email, publier un document, créer un APPROVAL l'utilisateur valide rendez-vous externe, modifier des données importantes 

@ DENY Action interdite 

supprimer des données importantes, accéder a une ressource non autorisée, exécuter une commande interdite 

Exemple d'écran d'approbation : 

A\ The agent wants to send this email. To: Professor | Subject: Project submission [Preview] APPROVE REJECT 

Exemple de blocage (audit log) : 

BLOCKED ACTION — Agent: WorkAgent — Action: DELETE_FILES Risk: HIGH — Policy: DENY — Reason: Destructive operation 

Cela répond a notre problématique : comment donner de l'autonomie a une IA sans lui donner un pouvoir illimité ? 

##### 5. Architecture technique 



<!-- Start of picture text -->
USER<br>|<br>———1<br>| Frontend |<br>——]<br>———1<br>| API/Backend|<br>—<br>———1<br>| aT aGenT |<br>——]<br>—Tt——_<br>Memory Planner Tools<br>Policy Engine<br>——,<br>ALLOW APPROVAL / DENY<br>|<br>ACTION > VERIFY<br><!-- End of picture text -->

LLM local : Ollama 

Application > Ollama > LLM local. Avantages : aucun cot d'API, données conservées localement, développement hors ligne, contréle de l'environnement. A\ Le modéle exact sera choisi selon les capacités de nos PC et sa licence. On ne promet pas qu'un modéle soit suffisamment performant avant de l'avoir testé. 

6. Mémoire, outils, vérification, auto-correction 

6.1 Mémoire 

Type Contenu Long terme User: rdle, préférences, projets, cours, régles, workflows Tache objectif, contexte, plan, actions, résultats, vérification Audit qui ? quoi ? quand ? pourquoi ? quelle permission ? quel résultat ? 

Stockage : PostgreSQL; recherche sémantique via pgvector (open source). 

6.2 Outils de l'agent 

© File - F] Calendar-21 Email Draft - E} Task - § Git- # Test -] Document - Search/Retrieval Aucun outil n'est appelé librement : 

Agent + Tool requested » Policy Engine + Permission check ALLOW => Execute APPROVAL > Ask user L Deny > Block 

@ Point fort & montrer au<sup>jury.</sup> 

###### 6.3 Vérification 

Un mauvais agent fait Plan > Action » Done. Le notre fait Plan > Action » Verification > « Est-ce que ¢a a vraiment marché ? ».Exemple (création de report.pdf) : V fichier existeV lisible- V contenu attendu présent - V format correct > seulement alors TASK COMPLETED. 

6.4 Auto-correction 

Run test > 9€ FAIL > analyser l'erreur + modifier le plan + retry + verify Limite: MAX_RETRIES = 3. Aprés trois échecs : @ Human intervention required (évite qu'un agent tourne indéfiniment). 

### 7. © DevSecOps complet 

Git Push + GitHub Actions [K SAST (Semgrep) 

- [ Secrets (Gitleaks) 

- L Dépendances (OWASP Dependency-Check) 

   - » Unit Tests + Integration Tests » Build Docker > Scan Trivy » Security Gate —— FAIL + STOP 

      - L pass » Deploy » DAST (OWASP ZAP) » Monitoring 

|Etape|Outil|Role|Démo|
|---|---|---|---|
|SAST|Semgrep|analyse du code source,<br>patterns dangereux|probléme critique<br>— %&<br>PIPELINE BLOCKED|
|Secrets|Gitleaks|détecte p. ex. API_KEY=xxxx|3 SECRET DETECTED,<br>pipeline stoppé|
|Dépendances|OWASP<br>Dependency-<br>Check|analyse package. json,<br>pom.xml, requiremen**t**s<br>. xt|dépendance vulnérable ><br>Security Gate BLOCK|
|Conteneur|Trivy|scan de l'image Docker|vulnérabilité introduite<br>volontairement puis corrigée|
|DAST|OWASP ZAP|teste l'application en<br>fonctionnement|SAST = code, DAST =<br>applicationquitourne|



Docker 

Chaque composant est conteneurisé via docker-compose.yml : frontend, backend, postgres, ollama, prometheus, grafana, loki. Un membre du<sup>jurypeutclonerleprojetetlancerdockercomposeup.</sup> 

##### 8. [hl] Observabilité et self-healing 

Outil Role Prometheus métriques : CPU, mémoire, requétes HTTP, temps de réponse, taux d'erreur, exécutions d'agent, actions échouées Grafana dashboards : statut API/Agent/DB/Ollama, nombre de taches, taux de succés, blocages sécurité, santé globale Loki logs centralisés : on retrace tout ce que l'agent a fait (tache, permission, outil, vérification) Opentelemetry trace d'une requéte: Frontend > Backend > Agent — Policy Engine > Tool > Database Health checks — endpoint /health par service, ex. { "status": "UP", "database": "UP", "agent": "UP" } 

A\ Le dashboard n'est pas le produit: il démontre l'observabilité du produit. 

# Z Self-healing (démo spectaculaire) 

Backend }{{ CRASH > Health check FAILED > SERVICE DOWN > Docker/Kubernetes redémarre > Health check SUCCESS + @ SERVICE RECOVERED 

Grafana montre l'incident, Loki les logs, Prometheus la panne et la récupération. 

### 9, @ Mi Stack technique 

Couche Technologies 

|Frontend|Vuejs, TypeScript, Tailwind CSS, déployé sur Vercel|
|---|---|
|Backend|Python, FastAPI (@cosystéme IA pratique)|
|IA|Ollama (LLM local) + orchestration d'agent maison|
|Base de<br>données|PostgreSQL + pgvector|
|Conteneurs|Docker, DockerCompose|
|cl/CD|GitHub, GitHub Actions|
|Sécurité|Semgrep, Gitleaks, OWASP Dependency-Check, Trivy,OWASP ZAP, Checkov|
|Tests|Pytest, Playwright|
|Observabilité|Prometheus, Grafana, Loki, OpenTelemetry|
|Orchestration|V1: DockerCompose ; ensuite éventuellement kind / Kubernetes si letemps le<br>permet|



Choix assumé: pas de gros framework agentique au début. On construit nous-mémes la boucle Plan > Tool + Verify > Retry pour réellement comprendre et défendre ce que nous présentons. Des services Java/JUnit restent possibles, mais Python + FastAPI simplifie l'agent. 

10. &% Répartition de l'équipe et structure GitHub 

|Personne|Périmétre|Role|
|---|---|---|
|3 P1—Al|LLM, agent, mémoire, planner, tools, vérification, retry|construit lecerveau|
|Agent|||
|FR p2—|frontend, backend, base de données, authentification,|construit le produit|
|Application|modes utilisateur, Ul, API||
|FR p3—|Docker, GitHub Actions, SAST, secrets, scan|construit la chaine|
|DevSecOps|dépendances/conteneurs, DAST, monitoring, logs, self-<br>healing|DevSecOps|



A Ine s'agit pas de trois projets séparés : tout converge vers Take Over My Work (Al Agent + Product + DevSecOps). 

TAKE-OVER-MY-WORK/ [EE frontend/ EK backend/ (api/ agent/ tools/ memory/ policies/ verification/) [ database/ [E tests/ (unit/ integration/ e2e/) |K infrastructure/ (docker/ prometheus/ grafana/ loki/) LE security/ (semgrep/ trivy/ gitleaks/ zap/) [L .github/workflows/devsecops.ym1 [- docker-compose.ym1 

- README .md 

11 BAD naw. ae ntn ie palnt (au nnlan s Vanes Ateidinntnd 

1. peg) PanWuurs wunpavcur Cumipiee (EACHIPIE . NerIZa, CLUUIaTLEy 

1. Onboarding : sélection du profil @ Student. 

2. Import: DevOps syllabus.pdf, TP1.pdf, Project_requirements.pdf, Schedule.pdf. 

3. Understanding: l'agent identifie cours, deadlines, exigences, taches, dépendances. 

4. Memory: enregistrement du profil, cours, projets, taches, régles. 

5. Requéte : « Take over my DevOps project preparation. » 

6. Planning: lire les exigences — inspecter le projet — identifier les manques — lancer les tests > préparer le rapport — vérifier. 

7. Permissions : exécuter les tests = @ ALLOW. 

8. Echec : Test #4 9€ FAILED. 

9. Raisonnement: analyse de I'erreur, proposition de correction. 

10. Retry: Retry #1 V PASS. 

11. Action sensible : envoi du rapport au professeur = Q HUMAN APPROVAL. Kenza clique APPROVE. 

12. Audit : Task Prepare DevOps project- 7 actions - 1 retry - 1 approbation - statut final SUCCESS. 

12. ® Public vs local, et @ cout Public Local Frontend sur Vercel (le jury Backend, agent, Ollama, PostgreSQL, Prometheus, Grafana, Loki, ouvre le lien) Docker (lancés pendant la démo) 

Objectif : 0 €. Pas d'API IA payante, de serveur cloud, de GPU cloud, de base payante ni de monitoring Saa8. Le seul vrai cotit : notre temps et les ressources de nos ordinateurs. 

#### 13. BM Scénario de soutenance 

Scéne Contenu 

1. Le probleme Student / Professor / Professional et leurs environnements complexes 2. « Teach your import cours, planning, projet, consignes agent » 3. « Give ita task « Take over this task. » » 

4. agent planifie | Understanding... Planning... Checking permissions... 

5. L'agent agit ¥ lit les documents V crée les taches V lance les tests V génére le rapport 6. Permission action sensible > @ APPROVAL REQUIRED = clic Approve 7. Panne erreur provoquée 9 SERVICE FAILURE 8. Self-healing Detection > Restart > Health check - @ RECOVERED 9. Attaque secret introduit dans le code — Gitleaks ~ ¥ PIPELINE BLOCKED = secret retiré sécurité — PASS 



1U. CCI INlal 

AGEN GULOTIOITIY v * SECUTILY Vv * IESUTIY v * UI/CU v * UDSETVdDIIILy v * Sell~ healing V - Human approval Y — TASK COMPLETED 

### 14. @ Intérét académique et pitch 

Nous ne présentons pas « une IA », mais trois problématiques simultanées : 

- © & Agentic Al: comprendre un environnement, planifier, utiliser des outils, agir, vérifier, se corriger. 

- © & Security: empécher un agent autonome de dépasser ses permissions, d'effectuer une action 

   - dangereuse ou d'accéder a une ressource interdite. 

- © © DevSecOps: garantir une plateforme testée, sécurisée, intégrée en continu, déployable, observable et résiliente. 

Pitch en une phrase (si le jury demande « c'est quoi votre projet ? ») : 

Take Over My Work est une plateforme d'agents IA sécurisés capable d'apprendre l'environnement de travail, d'étude ou d'enseignement d'un utilisateur, puis d'exécuter des taches qui lui sont déléguées. L'agent planifie ses actions, respecte un moteur de permissions, vérifie ses résultats et demande une validation humaine pour les opérations sensibles. L'ensemble du produit est développé selon une démarche DevSecOps intégrant CI/CD, tests automatisés, analyse de sécurité, observabilité et self-healing. 

Slogan : « Your work. Your rules. Your agent. » @p@ 

### 15. MVP proposé et points a valider 

Le document source s'arréte en recommandant de construire un MVP réaliste plutdt que les trois modes et 15 outils d'emblée, en commencant par un seul workflow. Proposition de cadrage (a discuter) : 

MVP : mode @ Student, scénario « DevOps project » de bout en bout. 

- e Agent: boucle Plan — Tool — Verify — Retry (3 essais max) 

- © Outils : File, Task, Test, Email Draft 

- © Policy Engine : ALLOW / APPROVAL / DENY avec audit log 

- © Pipeline : Semgrep + Gitleaks + Trivy + tests, avec Security Gate 

- © Monitoring : Prometheus + Grafana + Loki + /health, démo de self-healing 

Hors MVP (extensions) : modes Professor et Professional, outils Calendar/Git/Document/Search, Opentelemetry, ZAP, Kubernetes. 



Checklist de validation pour l'équipe 

- ° Le concept et le positionnement « agent, pas chatbot » sont validés 

- ° Les trois profils sont conservés ; seul le mode Student est dans le MVP 

- ° Le modéle Ollama sera testé sur nos machines avant tout engagement 

- e La stack (Vue/FastAPI/PostgreSQL/Docker) est validée 

- ° La répartition P1 / P2 / P3 est acceptée 

- ° La boucle d'agent est développée en interne (sans gros framework) 

- e Le périmétre MVP et les extensions sont arbitrés 

- ° Le scénario de soutenance en 10 scénes est validé 

- ° Le budget de 0 € est confirmé ° Un plannina et des ialons restent a définir 







