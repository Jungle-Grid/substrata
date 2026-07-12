# ES25 Industrial Sensor Gateway - Engineering Notes

DEMO / FICTIONAL DATA ONLY. Human review required.

## Product summary
ES25 is a fictional industrial sensor gateway that aggregates sensor readings and forwards telemetry to plant-management systems.

## Technical details
- ARM Cortex-A53 application processor
- Optional Wi-Fi/BLE module populated in some regional SKUs
- No AI accelerator
- Local rules engine for sensor thresholds
- MQTT over TLS appears in draft firmware notes

## Human-review question
Does TLS appear only as ordinary secure telemetry transport, or is cryptographic functionality a marketed/customer-configurable feature? Confirm regional SKU configuration.
