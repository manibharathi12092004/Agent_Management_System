FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy proxy code
COPY main.py .

# Create sandbox workspace
RUN mkdir -p /sandbox/data

# Expose port
EXPOSE 8080

# Run proxy
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
