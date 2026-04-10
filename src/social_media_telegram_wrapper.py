import os
import requests
import logging

# Configure logging for the Scheduler Subsystem
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramWrapper:
    """
    Social Media Wrapper for Telegram.
    Abstracts interactions for the Publisher Job to execute publication.
    """
    def __init__(self):
        # Fetches credentials from environment variables for security
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.api_base_url = f"https://api.telegram.org/bot{self.bot_token}"

        if not self.bot_token or not self.chat_id:
            logger.error("Telegram credentials missing in environment variables!")

    def publish_content(self, text, image_url=None):
        """
        Publishes platform-optimized content to Telegram.
        Supports HTML formatting as defined in the project glossary.
        """
        try:
            if image_url:
                endpoint = f"{self.api_base_url}/sendPhoto"
                payload = {
                    "chat_id": self.chat_id,
                    "photo": image_url,
                    "caption": text,
                    "parse_mode": "HTML"
                }
            else:
                endpoint = f"{self.api_base_url}/sendMessage"
                payload = {
                    "chat_id": self.chat_id,
                    "text": text,
                    "parse_mode": "HTML"
                }

            response = requests.post(endpoint, data=payload)
            response.raise_for_status()
            
            logger.info("Content successfully published to Telegram.")
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to publish to Telegram: {e}")
            return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    wrapper = TelegramWrapper()
    print("Telegram Wrapper Initialized.")
