from utils.logger import logger
from repositories.user_repository import user_repository
from repositories.policy_repository import policy_repository
from repositories.expense_repository import expense_repository
from seed.users import SEED_USERS
from seed.policies import SEED_POLICIES
from seed.expenses import SEED_EXPENSES

async def seed_users():
    if await user_repository.count() == 0:
        await user_repository.insert_many(SEED_USERS)
        logger.info("Seeded default demo users.")

async def seed_policies():
    if await policy_repository.count() == 0:
        await policy_repository.insert_many(SEED_POLICIES)
        logger.info("Seeded default policy configurations.")

async def seed_expenses():
    if await expense_repository.col.count_documents({}) == 0:
        await expense_repository.col.insert_many(SEED_EXPENSES)
        logger.info("Seeded sample demo expenses.")
    else:
        for exp in SEED_EXPENSES:
            if exp.get("receipt_url"):
                await expense_repository.col.update_one(
                    {"id": exp["id"]},
                    {"$set": {
                        "receipt_url": exp["receipt_url"],
                        "rule_engine": exp.get("rule_engine", {}),
                        "duplicate_check": exp.get("duplicate_check", {}),
                        "ai_analysis": exp.get("ai_analysis", {}),
                    }}
                )

async def seed_database():
    await seed_users()
    await seed_policies()
    await seed_expenses()
