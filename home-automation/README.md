# Home Automation

## Purpose
Reads temperature data from a 1‑Wire sensor on a Raspberry Pi and submits the reading to a remote API.

## Setup
1. Create and activate a virtual environment.
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install requests pytest
   ```
3. Set the **API_ENDPOINT** and **API_KEY** environment variables.
4. Run the script:
   ```bash
   python sensor_read.py
   ```

## Environment Variables
- **`API_ENDPOINT`** – URL of the service that accepts temperature readings.
- **`API_KEY`** – secret key used for authenticating with the service.

## Tests
Run the tests with:
```bash
pytest
```
