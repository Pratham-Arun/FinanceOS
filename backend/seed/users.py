import bcrypt

SEED_USERS = [
    {"id": "60d5ec49f1b29c2d18c1d501", "name": "System Administrator",
     "email": "admin@demo.com",
     "password_hash": bcrypt.hashpw(b"admin123", bcrypt.gensalt(10)).decode(),
     "role": "Admin", "manager_id": None},
    {"id": "60d5ec49f1b29c2d18c1d502", "name": "Pratham Employee",
     "email": "employee@demo.com",
     "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode(),
     "role": "Employee", "manager_id": "60d5ec49f1b29c2d18c1d503"},
    {"id": "60d5ec49f1b29c2d18c1d503", "name": "Pratham Manager",
     "email": "manager@demo.com",
     "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode(),
     "role": "Manager", "manager_id": "60d5ec49f1b29c2d18c1d504"},
    {"id": "60d5ec49f1b29c2d18c1d504", "name": "Pratham Finance",
     "email": "finance@demo.com",
     "password_hash": bcrypt.hashpw(b"demo1234", bcrypt.gensalt(10)).decode(),
     "role": "Finance", "manager_id": None},
]
