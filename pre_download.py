from fastembed import TextEmbedding
import os

print("Pre-downloading FastEmbed model: BAAI/bge-small-en-v1.5 ...")
model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
print("✅ Model downloaded and ready.")
