import numpy as np

np.random.seed(1)

refs = np.array([[1,3,7,9],[8,9,10,11],[5,5,2,2],[8,7,6,5]])
ref_norms = np.linalg.norm(refs,axis=1)
query = np.array([2,3,4,5])
print(refs)
print(query)
print(refs.dot(query)/ref_norms/np.linalg.norm(query))

refs = np.random.randn(100, 300)
ref_norms = np.linalg.norm(refs, axis=1)
query = refs[3,:]
print(refs.dot(query)/ref_norms/np.linalg.norm(query))

refs = np.random.randn(90000, 300)
ref_norms = np.linalg.norm(refs, axis=1)
query = refs[20,:]
print(np.argmax(refs.dot(query)/ref_norms/np.linalg.norm(query)))
