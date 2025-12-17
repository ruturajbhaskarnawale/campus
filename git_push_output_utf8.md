git : POST git-receive-pack (chunked)
At line:1 char:1
+ git push origin main -v > 
git_push_output.txt 2>&1
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~
    + CategoryInfo          : NotSpecified: 
    (POST git-receive-pack (chunked):Strin  
  g) [], RemoteException
    + FullyQualifiedErrorId : NativeCommand 
   Error
 
remote: error: GH013: Repository rule 
violations found for refs/heads/main.       
 
remote: 
remote: - GITHUB PUSH PROTECTION        
remote:   ΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓ
ÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇö
ΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇ
ö        
remote:     Resolve the following 
violations before pushing again        
remote: 
remote:     - Push cannot contain secrets   
     
remote: 
remote:             
remote:      (?) Learn how to resolve a 
blocked push        
remote:      https://docs.github.com/code-se
curity/secret-scanning/working-with-secret-s
canning-and-push-protection/working-with-pus
h-protection-from-the-command-line#resolving
-a-blocked-push        
remote:             
remote:             
remote:       ΓÇöΓÇö Google Cloud Service 
Account Credentials 
ΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇö        
remote:        locations:        
remote:          - commit: 
3364866adbf6e9f0b9e61a5d72ad3530ff8b6872    
    
remote:            path: 
backend/serviceAccountKey.json:1        
remote:             
remote:        (?) To push, remove secret 
from commit(s) or follow this URL to allow 
the secret.        
remote:        https://github.com/ruturajbha
skarnawale/campus/security/secret-scanning/u
nblock-secret/36yNOI3hcH9jMsDkNUohbmMkIMG   
     
remote:             
remote: 
remote: 
Pushing to https://github.com/ruturajbhaskar
nawale/campus.git
To https://github.com/ruturajbhaskarnawale/c
ampus.git
 ! [remote rejected] main -> main (push 
declined due to repository rule violations)
error: failed to push some refs to 'https://
github.com/ruturajbhaskarnawale/campus.git'
