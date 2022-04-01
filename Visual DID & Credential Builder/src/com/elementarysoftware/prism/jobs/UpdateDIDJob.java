package com.elementarysoftware.prism.jobs;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDKeyInfo;

import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.api.node.NodePayloadGenerator;
import io.iohk.atala.prism.api.node.UpdateDidInfo;
import io.iohk.atala.prism.crypto.Sha256Digest;
import io.iohk.atala.prism.crypto.keys.ECKeyPair;
import io.iohk.atala.prism.crypto.keys.ECPrivateKey;
import io.iohk.atala.prism.identity.LongFormPrismDid;
import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.identity.PrismKeyType;
import updateDid.PrismNodeUpdateAction;

public class UpdateDIDJob implements Runnable {

	private DID did;

	private DIDKeyInfo[] keysToAdd;
	private String[] keysToRevoke;

	public UpdateDIDJob(DID d) {
		did = d;
	}



	public void run() {
		String operationHash = "";
		try {

			if(keysToRevoke != null && keysToRevoke.length == 1) {
				KeyGenerator keygen = KeyGenerator.INSTANCE;

				ECKeyPair masterKeyPair = keygen.deriveKeyFromFullPath(did.getSeed(), 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);

				LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

				Map<String, ECPrivateKey> keys = new HashMap<String, ECPrivateKey>();
				keys.put(PrismDid.getDEFAULT_MASTER_KEY_ID(), masterKeyPair.getPrivateKey());
				NodePayloadGenerator nodePayloadGenerator = new NodePayloadGenerator(unpublishedDid, keys);

				Sha256Digest oldHash = Sha256Digest.fromHex(did.getLatestOperationHash());

				List<PrismKeyInformation> keysToAdd = new Vector<PrismKeyInformation>();

				UpdateDidInfo updateDidInfo = nodePayloadGenerator.updateDid(
						oldHash, 
						PrismDid.getDEFAULT_MASTER_KEY_ID(), 
						keysToAdd.toArray(PrismKeyInformation[]::new), 
						keysToRevoke);

				operationHash = PrismNodeUpdateAction.Companion.revokeKeys(updateDidInfo, unpublishedDid, oldHash, keysToRevoke);
				System.out.println("REVOKE OPERATION HASH RETURNED = "+ operationHash);				
			}
			else if(keysToAdd != null && keysToAdd.length == 1) {
				KeyGenerator keygen = KeyGenerator.INSTANCE;

				ECKeyPair masterKeyPair = keygen.deriveKeyFromFullPath(did.getSeed(), 0, PrismKeyType.INSTANCE.getMASTER_KEY(), 0);
				ECKeyPair keyPairToAdd = keygen.deriveKeyFromFullPath(did.getSeed(), 0, keysToAdd[0].getKeyType(), keysToAdd[0].getKeyIndex());



				LongFormPrismDid unpublishedDid = PrismDid.buildLongFormFromMasterPublicKey(masterKeyPair.getPublicKey());

				Map<String, ECPrivateKey> keys = new HashMap<String, ECPrivateKey>();
				keys.put(PrismDid.getDEFAULT_MASTER_KEY_ID(), masterKeyPair.getPrivateKey());
				NodePayloadGenerator nodePayloadGenerator = new NodePayloadGenerator(unpublishedDid, keys);

				System.out.println("latest operation hash "+ did.getLatestOperationHash());
				
				Sha256Digest oldHash = Sha256Digest.fromHex(did.getLatestOperationHash());

				List<PrismKeyInformation> keysToAddList = new Vector<PrismKeyInformation>();

				/*Sha256Digest stateHash = unpublishedDid.getStateHash();
				
				System.out.println("state hash "+ stateHash.getHexValue());
				
				if(!stateHash.getHexValue().equals(oldHash.getHexValue())) {
					System.out.println("latest hash doesn't correspond to current state. Using current state");
					oldHash = stateHash;
				}*/
				//newKeyId = PrismDid.getDEFAULT_ISSUING_KEY_ID()   issuing0
				//keysToAddList.add(new PrismKeyInformation("issuing1", keysToAdd[0].getKeyType(), keyPairToAdd.getPublicKey(), null, null));


				String keyNameToAdd = keysToAdd[0].getKeyName();
				if(keyNameToAdd.trim().equals("")) {
					// no key name provided...set key name as default according to type and index
					int typeToAdd = keysToAdd[0].getKeyType();
					if(typeToAdd == PrismKeyType.INSTANCE.getISSUING_KEY()) {
						keyNameToAdd = PrismDid.getDEFAULT_ISSUING_KEY_ID();
					}
					else if(typeToAdd == PrismKeyType.INSTANCE.getMASTER_KEY()) {
						keyNameToAdd = PrismDid.getDEFAULT_MASTER_KEY_ID();
					}
					else if(typeToAdd == PrismKeyType.INSTANCE.getREVOCATION_KEY()) {
						keyNameToAdd = PrismDid.getDEFAULT_REVOCATION_KEY_ID();
					}

					keyNameToAdd.replace("0", ""+keysToAdd[0].getKeyIndex());
				}


				keysToAddList.add(new PrismKeyInformation(keyNameToAdd, keysToAdd[0].getKeyType(), keyPairToAdd.getPublicKey(), null, null));

				List<String> keysToRevokeList = new Vector<String>();

				UpdateDidInfo updateDidInfo = nodePayloadGenerator.updateDid(
						oldHash, 
						PrismDid.getDEFAULT_MASTER_KEY_ID(), 
						keysToAddList.toArray(PrismKeyInformation[]::new), 
						keysToRevokeList.toArray(String[]::new));

				// Creating a File object that represents the disk file. 
				PrintStream o = new PrintStream(new FileOutputStream(did.getLogFilePath(),true), true); 

				// Store current System.out before assigning a new value 
				PrintStream console = System.out; 

				// Assign o to output stream 
				System.setOut(o); 

				operationHash = PrismNodeUpdateAction.Companion.addKeys(updateDidInfo, unpublishedDid, oldHash, keysToAddList.toArray(PrismKeyInformation[]::new));

				System.out.println("ADD OPERATION HASH RETURNED = "+ operationHash);

				System.setOut(console);

				//TODO: CHECK TO SEE IF IT IS POSSIBLE TO RETRY USING THE HASH FROM PrismDid - .getStateHash(). WAS NOT POSSIBLE
				//TODO: Check to see if it is poosbile to retry using empty Optional oldHash if operation fails.
				/*
				if(!operationHash.equals("InvalidPreviousOperation()")) {
					System.out.println("ADD OPERATION HASH RETURNED = "+ operationHash);
				}
				else {
					System.out.println("ADD OPERATION REJECTED BECAUSE OF INVALID OPERATION HASH. RETRY WITHOUT OPERATION HASH");


					//Optional<Sha256Digest> empty = Optional.empty();
					//empty.nu
					//oldHash = null;
					//Optional<Sha256Digest> oldHashOptional = Optional.ofNullable(oldHash);

					//Optional<Sha256Digest> empty = Optional.empty();

					//nodePayloadGenerator.u

					CreateDidInfo createDidInfo = nodePayloadGenerator.createDid(PrismDid.getDEFAULT_MASTER_KEY_ID());
					Sha256Digest createOperationHash = createDidInfo.getOperationHash();

					updateDidInfo = nodePayloadGenerator.updateDid(
							createOperationHash,
							PrismDid.getDEFAULT_MASTER_KEY_ID(), 
							keysToAddList.toArray(PrismKeyInformation[]::new), 
							keysToRevokeList.toArray(String[]::new));

					operationHash = PrismNodeUpdateAction.Companion.addKeys(updateDidInfo, unpublishedDid, createOperationHash, keysToAddList.toArray(PrismKeyInformation[]::new));
					System.out.println("RETRY ADD OPERATION HASH RETURNED = "+ operationHash);
				}*/
			}
			else {
				operationHash = PrismNodeUpdateAction.Companion.updateDid(did.getSeed(), did.getLatestOperationHash());
				System.out.println("UPDATE OPERATION HASH RETURNED = "+ operationHash);
			}
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		if(operationHash != "") {
			System.out.println("Saving operation hash to xml");
			did.setLatestOperationHash(operationHash);
			System.out.println("Operation hash after xml update "+ did.getLatestOperationHash());
		}
	}

	public void keysToRevoke(String[] keyNames) {
		keysToRevoke = keyNames;
	}


	public void keyToAdd(DIDKeyInfo[] keyInfo) {
		keysToAdd = keyInfo;
	}

}
