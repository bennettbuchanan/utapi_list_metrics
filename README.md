# Quickstart

```
node list_metrics.js --help
```

Example request:

```
node list_metrics.js \
--metric buckets \
--buckets my-bucket \
--start 1476231300000 \
--end 1476233099999 \
--access-key D6Q2PO2IBKLMNX12U3E9 \
--secret-key csB2iEq+FibcXzu9/PYv7L6oXPi6EqGxjhMsVUgD \
--host 127.0.0.1 \
--port 8100
```

Example request for a listing of recent metrics:

```
node list_metrics.js \
--metric buckets \
--buckets utapi-test \
--recent \
--access-key D6Q2PO2IBKLMNX12U3E9 \
--secret-key csB2iEq+FibcXzu9/PYv7L6oXPi6EqGxjhMsVUgD \
--host 127.0.0.1 \
--port 8100
```

# Extract tape archive:

```
tar -xf utapi_list_metrics.tar 
``` 
